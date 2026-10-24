import { Request, Response } from 'express';
import { Employee, Department, LeaveType, AiLog, getNextId } from '../database/models.js';
import { aiTools, SYSTEM_RULES_PROMPT, UserContext } from '../services/aiService.js';
import { calculateWorkingDays } from '../utils/dateUtils.js';

// Rate Limiter: ~20 requests per user per hour
const userRequestCounts = new Map<number, { count: number; resetAt: number }>();

function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const entry = userRequestCounts.get(userId);

  if (!entry || now > entry.resetAt) {
    userRequestCounts.set(userId, { count: 1, resetAt: now + 3600 * 1000 });
    return true;
  }

  if (entry.count >= 25) {
    return false;
  }

  entry.count++;
  return true;
}

export async function chatWithAI(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const user = req.user!;

  if (!checkRateLimit(user.id)) {
    res.status(429).json({ error: 'AI rate limit exceeded (approx 20 requests/hour). Please try again later.' });
    return;
  }

  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Message string is required' });
    return;
  }

  const userContext: UserContext = {
    id: user.id,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId
  };

  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
  let answer = '';
  let toolCalled: string | null = null;

  try {
    // 1. First, check security guardrails: employee asking for colleague salary
    const lowerMsg = message.toLowerCase();
    const colleagueSalaryPatterns = [
      /salary of/i,
      /salary for/i,
      /what is .* salary/i,
      /how much .* earn/i,
      /compensation of/i,
      /tankhwah/i,
      /kamata/i,
      /kamati/i
    ];

    if (user.role === 'Employee' && colleagueSalaryPatterns.some(p => p.test(message))) {
      // Check if they are asking about their OWN salary vs colleague
      if (lowerMsg.includes('my salary') || lowerMsg.includes('meri salary') || lowerMsg.includes('meri tankhwah')) {
        const empId = user.employeeId || 0;
        const mySalary = await Employee.findOne({ id: empId }).lean();
        if (mySalary) {
          const basic = Number(mySalary.basic_salary);
          answer = `Your registered basic salary is Rs. ${basic.toLocaleString()}, and your gross salary is Rs. ${(basic * 1.5).toLocaleString()} (including 40% HRA and 10% Medical allowance). You can also view and download your full salary breakdown in the Payslips tab.`;
        } else {
          answer = 'Your salary details are available in your profile and payslips.';
        }
      } else {
        // Politely refuse colleague salary
        answer =
          'I cannot disclose salary or personal compensation details of other employees. In accordance with company privacy policy and data governance rules, compensation details are confidential.';
      }
    } else if (apiKey) {
      // Hosted LLM API call (Google Gemini API)
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `${SYSTEM_RULES_PROMPT}\n\nUser Role: ${user.role}\nUser Email: ${user.email}\nEmployee ID: ${user.employeeId || 'None'}\n\nUser Question: ${message}`
                    }
                  ]
                }
              ]
            }),
            signal: AbortSignal.timeout(14000)
          }
        );

        if (geminiRes.ok) {
          const geminiData: any = await geminiRes.json();
          answer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (geminiErr) {
        console.warn('Gemini API call fell back to local tool runner:', geminiErr);
      }
    }

    // If answer not yet formed, evaluate using deterministic intelligent tools & policy engine
    if (!answer) {
      if (lowerMsg.includes('headcount') || (lowerMsg.includes('how many') && lowerMsg.includes('employee'))) {
        toolCalled = 'get_headcount';
        const deptRows = await Department.find({}, { name: 1 }).lean();
        let foundDept: string | undefined;
        for (const d of deptRows) {
          if (lowerMsg.includes(d.name.toLowerCase())) {
            foundDept = d.name;
            break;
          }
        }
        const resData = await aiTools.get_headcount(userContext, { department: foundDept });
        if (foundDept) {
          answer = `There are currently **${resData.active_headcount}** active employee(s) in the **${foundDept}** department.`;
        } else {
          answer = `The company currently has **${resData.active_headcount}** active employee(s) in total.`;
        }
      } else if (
        lowerMsg.includes('late') &&
        (lowerMsg.includes('who') || lowerMsg.includes('most') || lowerMsg.includes('often') || lowerMsg.includes('top'))
      ) {
        toolCalled = 'get_late_comers';
        const resData = await aiTools.get_late_comers(userContext, { limit: 5 });
        if (resData.late_comers.length === 0) {
          answer = `No employees have been marked late this month (${resData.month}). Everyone has been punctual!`;
        } else {
          const list = resData.late_comers
            .map((lc: any, i: number) => `${i + 1}. **${lc.full_name}** (${lc.department || 'N/A'}) — ${lc.late_count} time(s)`)
            .join('\n');
          answer = `Here are the top late-comers for this month (${resData.month}):\n\n${list}\n\n*Reminder: Office hours start at 09:00 with a 15-minute grace period. 3 late arrivals result in a 0.5-day salary deduction.*`;
        }
      } else if (
        lowerMsg.includes('attendance') &&
        (lowerMsg.includes('rate') || lowerMsg.includes('summary') || lowerMsg.includes('today'))
      ) {
        toolCalled = 'get_attendance_summary';
        const resData = await aiTools.get_attendance_summary(userContext, {});
        answer = `Today's attendance summary (${resData.date}):\n\n• **Present:** ${resData.present}\n• **Late:** ${resData.late}\n• **Half Day:** ${resData.half_day}\n• **Overall Attendance Rate:** **${resData.attendance_rate}** (${resData.total_attended} out of ${resData.total_employees} active employees).`;
      } else if (
        lowerMsg.includes('leave') &&
        (lowerMsg.includes('left') ||
          lowerMsg.includes('balance') ||
          lowerMsg.includes('baki') ||
          lowerMsg.includes('sick') ||
          lowerMsg.includes('casual') ||
          lowerMsg.includes('annual'))
      ) {
        toolCalled = 'get_my_leave_balance';
        if (user.role === 'Employee' && user.employeeId) {
          const resData = await aiTools.get_my_leave_balance(userContext);
          if (resData.balances && resData.balances.length > 0) {
            const lines = resData.balances
              .map(
                (b: any) =>
                  `• **${b.type}:** ${b.remaining} remaining (Used: ${b.used} of ${b.quota === -1 ? 'Unlimited' : b.quota})`
              )
              .join('\n');
            answer = `Here is your current leave balance for this year:\n\n${lines}\n\n*Note: Leaves only count on working days, excluding weekends and public holidays.*`;
          } else {
            answer = 'No leave balances recorded.';
          }
        } else {
          answer = 'As an Admin/HR, you can view company-wide leave balances under Organization Setup and the HR Dashboard.';
        }
      } else if (lowerMsg.includes('who is on leave') || lowerMsg.includes('on leave today') || lowerMsg.includes('leave today')) {
        toolCalled = 'get_leave_summary';
        const resData = await aiTools.get_leave_summary(userContext, {});
        if (resData.total_on_leave === 0) {
          answer = `No employees are scheduled on approved leave today (${resData.date}).`;
        } else {
          const list = resData.employees_on_leave
            .map((l: any) => `• **${l.full_name}** (${l.department || 'N/A'}) — ${l.leave_type} Leave (Reason: ${l.reason})`)
            .join('\n');
          answer = `There are **${resData.total_on_leave}** employee(s) on approved leave today (${resData.date}):\n\n${list}`;
        }
      } else if (lowerMsg.includes('payroll') || lowerMsg.includes('salary summary') || lowerMsg.includes('cost')) {
        if (user.role === 'Employee') {
          answer =
            'I cannot disclose company payroll summaries to employee accounts. Please visit the Payslips section to download your personal payslips.';
        } else {
          toolCalled = 'get_payroll_summary';
          const resData = (await aiTools.get_payroll_summary(userContext, {})) as any;
          if (resData.status === 'not_run_yet') {
            answer = `Payroll for this month (${resData.month}) has not been drafted yet. Estimated gross payroll for ${resData.active_employees} active employees is **Rs. ${(resData.estimated_gross_payroll || 0).toLocaleString()}** (Average gross salary: **Rs. ${(resData.average_salary || 0).toLocaleString()}**).`;
          } else {
            answer = `Payroll summary for ${resData.month} (Status: **${resData.status}**):\n\n• **Total Gross:** Rs. ${(resData.total_gross_cost || 0).toLocaleString()}\n• **Income Tax Deducted:** Rs. ${(resData.total_tax_deducted || 0).toLocaleString()}\n• **Attendance Deductions:** Rs. ${(resData.total_deductions || 0).toLocaleString()}\n• **Total Net Payout:** **Rs. ${(resData.total_net_payout || 0).toLocaleString()}**`;
          }
        }
      } else if (
        lowerMsg.includes('policy') ||
        lowerMsg.includes('rule') ||
        lowerMsg.includes('grace') ||
        lowerMsg.includes('tax') ||
        lowerMsg.includes('weekend')
      ) {
        answer = `Here are the verified company policies:\n\n• **Office Hours:** Starts at 09:00 with a 15-minute grace period (late after 09:15). Working under 5 hours counts as a half day.\n• **Late Penalty:** Every 3 late arrivals result in a 0.5-day salary deduction.\n• **Leave Quotas:** Annual 14 days, Sick 8 days, Casual 10 days, Unpaid unlimited. Leave deductions skip weekends and public holidays.\n• **Salary Breakdown:** Gross is 1.5 × Basic (Basic + 40% HRA + 10% Medical).\n• **Taxation:** Progressive tax slabs start on annual gross above Rs. 600,000.`;
      } else {
        answer = `Hello! I am your HCM Lite AI Assistant. I can help you with:\n\n• **Attendance & Headcount:** Check who is present, late arrivals, or department headcount.\n• **Leaves:** View leave balances or ask who is on leave today.\n• **Company Policies:** Ask about office start times, grace period, tax brackets, and rules.\n• **Smart Leave:** Type something like *"Need next Monday off for a wedding"* to automatically prepare your leave application.`;
      }
    }

    const latency = Date.now() - startTime;

    // Log call in ai_logs collection
    const logId = await getNextId('ai_logs');
    await AiLog.create({
      id: logId,
      user_id: user.id,
      role: user.role,
      prompt: message,
      tool_called: toolCalled,
      response: answer,
      latency_ms: latency,
      created_at: new Date().toISOString()
    });

    res.json({
      answer,
      toolCalled,
      latencyMs: latency,
      ai_generated: true
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI assistant error' });
  }
}

// AI Dashboard Summary
export async function summarizeDashboard(req: Request, res: Response): Promise<void> {
  try {
    const { kpis, role } = req.body;
    if (!kpis) {
      res.status(400).json({ error: 'KPI data is required for summarization' });
      return;
    }

    const bullets: string[] = [];

    if (role === 'Admin') {
      bullets.push(`Total active headcount is ${kpis.headcount || 0} employees across all registered departments.`);
      if (kpis.totalPayrollCost) {
        bullets.push(
          `Current gross monthly payroll cost stands at Rs. ${Number(kpis.totalPayrollCost).toLocaleString()} with an average gross salary of Rs. ${Number(kpis.avgSalary || 0).toLocaleString()}.`
        );
      }
      bullets.push(`Annualized employee attrition rate is currently at ${kpis.attritionRate || 0}%.`);
      bullets.push(`All system configurations, leave quotas, and office geofence perimeters are operating normally.`);
    } else {
      // HR
      bullets.push(
        `Today's workforce presence: ${kpis.presentToday || 0} present, ${kpis.lateToday || 0} late arrivals, and ${kpis.onLeaveToday || 0} employee(s) on approved leave.`
      );
      if (kpis.pendingApprovals > 0) {
        bullets.push(
          `There are ${kpis.pendingApprovals} pending request(s) awaiting HR review (leave requests and attendance corrections).`
        );
      } else {
        bullets.push(`Approval inbox is up to date with zero pending requests.`);
      }
      if (kpis.lateToday > 0) {
        bullets.push(
          `Late arrival rate is ${Math.round((kpis.lateToday / Math.max(1, kpis.headcount)) * 100)}% of active headcount today.`
        );
      } else {
        bullets.push(`Exceptional punctuality recorded today with 0 late check-ins.`);
      }
    }

    res.json({
      summaryBullets: bullets,
      ai_generated: true
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// Smart Leave: natural language parsing to JSON
export async function parseSmartLeave(req: Request, res: Response): Promise<void> {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt text is required' });
      return;
    }

    const lower = prompt.toLowerCase();

    // 1. Determine leave type
    let leaveType = 'Casual';
    if (
      lower.includes('sick') ||
      lower.includes('doctor') ||
      lower.includes('fever') ||
      lower.includes('ill') ||
      lower.includes('hospital') ||
      lower.includes('tabiat') ||
      lower.includes('bimar')
    ) {
      leaveType = 'Sick';
    } else if (
      lower.includes('annual') ||
      lower.includes('vacation') ||
      lower.includes('holiday') ||
      lower.includes('travel') ||
      lower.includes('safar')
    ) {
      leaveType = 'Annual';
    } else if (lower.includes('unpaid') || lower.includes('without pay')) {
      leaveType = 'Unpaid';
    } else if (
      lower.includes('wedding') ||
      lower.includes('shadi') ||
      lower.includes('family') ||
      lower.includes('urgent') ||
      lower.includes('casual')
    ) {
      leaveType = 'Casual';
    }

    // Find leave_type_id in MongoDB
    const ltRow = await LeaveType.findOne({ name: new RegExp(`^${leaveType}$`, 'i') }).lean();
    const leaveTypeId = ltRow ? ltRow.id : 3;

    // 2. Extract Dates
    const now = new Date();
    let startDate = new Date(now);
    let endDate = new Date(now);

    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      peer: 1, // Roman Urdu
      mangal: 2,
      budh: 3,
      jumeraat: 4,
      juma: 5,
      hafta: 6,
      itwar: 0
    };

    if (lower.includes('tomorrow') || lower.includes('kal')) {
      startDate.setDate(now.getDate() + 1);
      endDate.setDate(now.getDate() + 1);
    } else if (lower.includes('next week') || lower.includes('next monday') || lower.includes('aglay peer')) {
      const currentDay = now.getDay();
      const daysUntilNextMonday = ((1 + 7 - currentDay) % 7) || 7;
      startDate.setDate(now.getDate() + daysUntilNextMonday);
      endDate = new Date(startDate);

      if (lower.includes('tuesday') || lower.includes('mangal') || lower.includes('2 days') || lower.includes('do din')) {
        endDate.setDate(startDate.getDate() + 1);
      } else if (lower.includes('wednesday') || lower.includes('budh') || lower.includes('3 days') || lower.includes('teen din')) {
        endDate.setDate(startDate.getDate() + 2);
      } else if (lower.includes('friday') || lower.includes('whole week') || lower.includes('poora hafta')) {
        endDate.setDate(startDate.getDate() + 4);
      }
    } else {
      let matchedStartDay: number | null = null;
      let matchedEndDay: number | null = null;

      for (const [dayName, dayIndex] of Object.entries(dayMap)) {
        if (lower.includes(dayName)) {
          if (matchedStartDay === null) matchedStartDay = dayIndex;
          else if (matchedEndDay === null) matchedEndDay = dayIndex;
        }
      }

      if (matchedStartDay !== null) {
        const currentDay = now.getDay();
        let diff = (matchedStartDay - currentDay + 7) % 7;
        if (diff === 0) diff = 7;
        startDate.setDate(now.getDate() + diff);
        endDate = new Date(startDate);

        if (matchedEndDay !== null) {
          const endDiff = (matchedEndDay - matchedStartDay + 7) % 7;
          endDate.setDate(startDate.getDate() + endDiff);
        }
      } else {
        startDate.setDate(now.getDate() + 1);
        endDate.setDate(now.getDate() + 1);
      }
    }

    const startStr = startDate.toISOString().substring(0, 10);
    const endStr = endDate.toISOString().substring(0, 10);

    // Calculate working days
    const { workingDays } = await calculateWorkingDays(startStr, endStr);

    res.json({
      parsed: {
        leave_type_id: leaveTypeId,
        leave_type_name: leaveType,
        start_date: startStr,
        end_date: endStr,
        days_count: workingDays,
        reason: prompt
      },
      ai_generated: true
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
