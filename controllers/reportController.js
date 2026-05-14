// =====================================================
// Report Controller - All Dynamic Data from Database
// =====================================================

const pool = require('../config/db');

/**
 * Get Sales Report - Dynamic data from invoices table
 * GET /api/v1/reports/sales
 */
const getSalesReport = async (req, res) => {
  try {
    const { start_date, end_date, company_id, client_id, employee_id, user_id } = req.query;
    const filterCompanyId = company_id || req.companyId || 1;
    
    let whereClause = 'WHERE i.company_id = ?';
    const params = [filterCompanyId];
    
    if (client_id) {
      whereClause += ' AND i.client_id = ?';
      params.push(client_id);
    }
    
    if (employee_id || user_id) {
      whereClause += ' AND i.created_by = ?';
      params.push(employee_id || user_id);
    }
    
    if (start_date) {
      whereClause += ' AND DATE(i.created_at) >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND DATE(i.created_at) <= ?';
      params.push(end_date);
    }
    
    // Get sales data grouped by month from real invoice data
    const [sales] = await pool.execute(
      `SELECT 
        DATE_FORMAT(i.created_at, '%Y-%m') as month,
        DATE_FORMAT(i.created_at, '%b') as month_name,
        COUNT(*) as count,
        COALESCE(SUM(i.total), 0) as revenue,
        COALESCE(SUM(CASE WHEN i.status IN ('Paid', 'Fully Paid') THEN i.total ELSE i.paid END), 0) as paid,
        COALESCE(SUM(CASE WHEN i.status NOT IN ('Paid', 'Fully Paid') THEN i.total - COALESCE(i.paid, 0) ELSE 0 END), 0) as unpaid
       FROM invoices i
       ${whereClause}
       GROUP BY DATE_FORMAT(i.created_at, '%Y-%m'), DATE_FORMAT(i.created_at, '%b')
       ORDER BY month DESC
       LIMIT 12`,
      params
    );
    
    console.log('Sales Report Query Result:', sales);
    
    res.json({
      success: true,
      data: sales,
      total: {
        revenue: sales.reduce((sum, s) => sum + parseFloat(s.revenue || 0), 0),
        paid: sales.reduce((sum, s) => sum + parseFloat(s.paid || 0), 0),
        unpaid: sales.reduce((sum, s) => sum + parseFloat(s.unpaid || 0), 0),
        count: sales.reduce((sum, s) => sum + parseInt(s.count || 0), 0)
      }
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch sales report'
    });
  }
};

/**
 * Get Revenue Report - Dynamic data from invoices table
 * GET /api/v1/reports/revenue
 */
const getRevenueReport = async (req, res) => {
  try {
    const { start_date, end_date, company_id, client_id, employee_id, user_id, period = 'monthly' } = req.query;
    const filterCompanyId = company_id || req.companyId || 1;
    
    let whereClause = 'WHERE i.company_id = ?';
    const params = [filterCompanyId];
    
    if (client_id) {
      whereClause += ' AND i.client_id = ?';
      params.push(client_id);
    }
    
    if (employee_id || user_id) {
      whereClause += ' AND i.created_by = ?';
      params.push(employee_id || user_id);
    }
    
    if (start_date) {
      whereClause += ' AND DATE(i.created_at) >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND DATE(i.created_at) <= ?';
      params.push(end_date);
    }
    
    let groupBy = '';
    let selectPeriod = '';
    if (period === 'quarterly') {
      groupBy = `QUARTER(i.created_at), YEAR(i.created_at)`;
      selectPeriod = 'CONCAT("Q", QUARTER(i.created_at), " ", YEAR(i.created_at)) as period';
    } else if (period === 'yearly') {
      groupBy = `YEAR(i.created_at)`;
      selectPeriod = 'CAST(YEAR(i.created_at) AS CHAR) as period';
    } else {
      groupBy = `DATE_FORMAT(i.created_at, '%Y-%m')`;
      selectPeriod = 'DATE_FORMAT(i.created_at, "%b %Y") as period';
    }
    
    const [revenue] = await pool.execute(
      `SELECT 
        ${selectPeriod},
        COALESCE(SUM(i.total), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN i.status IN ('Paid', 'Fully Paid') THEN i.total ELSE i.paid END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN i.status NOT IN ('Paid', 'Fully Paid') THEN i.total - COALESCE(i.paid, 0) ELSE 0 END), 0) as total_unpaid,
        COUNT(*) as invoice_count
       FROM invoices i
       ${whereClause}
       GROUP BY ${groupBy}
       ORDER BY MIN(i.created_at) DESC
       LIMIT 12`,
      params
    );
    
    console.log('Revenue Report Query Result:', revenue);
    
    res.json({
      success: true,
      data: revenue,
      total: {
        revenue: revenue.reduce((sum, r) => sum + parseFloat(r.total_revenue || 0), 0),
        paid: revenue.reduce((sum, r) => sum + parseFloat(r.total_paid || 0), 0),
        unpaid: revenue.reduce((sum, r) => sum + parseFloat(r.total_unpaid || 0), 0),
        invoices: revenue.reduce((sum, r) => sum + parseInt(r.invoice_count || 0), 0)
      }
    });
  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch revenue report'
    });
  }
};

/**
 * Get Project Status Report - Dynamic data from projects table
 * GET /api/v1/reports/projects
 */
const getProjectStatusReport = async (req, res) => {
  try {
    const { company_id, client_id, employee_id, user_id, start_date, end_date } = req.query;
    const filterCompanyId = company_id || req.companyId || 1;
    
    let whereClause = 'WHERE p.company_id = ?';
    const params = [filterCompanyId];
    
    if (client_id) {
      whereClause += ' AND p.client_id = ?';
      params.push(client_id);
    }
    
    if (start_date) {
      whereClause += ' AND DATE(p.created_at) >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND DATE(p.created_at) <= ?';
      params.push(end_date);
    }
    
    // Get project count by status
    const [status] = await pool.execute(
      `SELECT 
        COALESCE(p.status, 'Not Started') as status,
        COUNT(*) as count,
        COALESCE(SUM(p.budget), 0) as total_budget
       FROM projects p
       ${whereClause}
       GROUP BY p.status
       ORDER BY count DESC`,
      params
    );
    
    // Get project list with details - use project_name column and proper client name
    const [projects] = await pool.execute(
      `SELECT 
        p.id,
        p.project_name,
        p.status,
        p.budget,
        p.start_date,
        p.deadline,
        COALESCE(u.name, c.company_name) as client_name,
        c.company_name as client_company_name
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       LEFT JOIN users u ON c.owner_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT 20`,
      params
    );
    
    console.log('Project Status Report Query Result:', status);
    
    res.json({
      success: true,
      data: status,
      projects: projects,
      total: {
        projects: status.reduce((sum, s) => sum + parseInt(s.count || 0), 0),
        budget: status.reduce((sum, s) => sum + parseFloat(s.total_budget || 0), 0)
      }
    });
  } catch (error) {
    console.error('Get project status report error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch project status report'
    });
  }
};

/**
 * Get Employee Performance Report - Dynamic data from users/employees table
 * GET /api/v1/reports/employees
 */
const getEmployeePerformanceReport = async (req, res) => {
  try {
    const { start_date, end_date, company_id, client_id, employee_id, user_id } = req.query;
    const filterCompanyId = company_id || req.companyId || 1;
    
    console.log('Employee Performance Report - Company ID:', filterCompanyId);
    
    // Get employees using the working pattern from employeeController
    let employees = [];
    
    try {
      // Use the same query pattern as employeeController that works
      // Join through users table to get company_id
      const [empResult] = await pool.execute(
        `SELECT 
          e.id,
          e.user_id,
          u.name,
          u.email,
          e.department_id,
          e.position_id,
          d.name as department_name,
          pos.name as position_name
         FROM employees e
         INNER JOIN users u ON e.user_id = u.id
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN positions pos ON e.position_id = pos.id
         WHERE u.company_id = ? AND u.is_deleted = 0
         LIMIT 50`,
        [filterCompanyId]
      );
      employees = empResult.map(e => ({
        id: e.id,
        user_id: e.user_id,
        name: e.name || 'Employee',
        email: e.email || '',
        designation: e.position_name || '',
        department: e.department_name || ''
      }));
      console.log('Found employees from employees table:', employees.length);
    } catch (e) {
      console.log('Error querying employees table:', e.message);
    }
    
    // If no employees found, try users table
    if (employees.length === 0) {
      try {
        const [userResult] = await pool.execute(
          `SELECT 
            u.id,
            u.id as user_id,
            u.name,
            u.email,
            u.role as designation
           FROM users u
           WHERE u.company_id = ? AND u.role IN ('EMPLOYEE', 'employee', 'Employee', 'ADMIN', 'admin', 'Admin')
           LIMIT 50`,
          [filterCompanyId]
        );
        employees = userResult.map(u => ({
          id: u.id,
          user_id: u.user_id,
          name: u.name || 'Employee',
          email: u.email || '',
          designation: u.designation || '',
          department: ''
        }));
        console.log('Found users with employee role:', employees.length);
      } catch (e) {
        console.log('Error querying users table:', e.message);
      }
    }
    
    // Filter by specific employee if requested
    if ((employee_id || user_id) && employees.length > 0) {
      const targetId = parseInt(employee_id || user_id);
      employees = employees.filter(e => e.id === targetId || e.user_id === targetId);
    }
    
    // Get performance data for each employee
    const performanceData = await Promise.all(employees.map(async (emp) => {
      const userId = emp.user_id || emp.id;
      let tasksCompleted = 0;
      let tasksInProgress = 0;
      let tasksPending = 0;
      let totalTasks = 0;
      let projectsAssigned = 0;
      let hoursLogged = 0;
      
      // Get task counts from task_assignees junction table
      try {
        // Tasks completed (Done status)
        const [completedResult] = await pool.execute(
          `SELECT COUNT(DISTINCT ta.task_id) as count 
           FROM task_assignees ta
           JOIN tasks t ON ta.task_id = t.id
           WHERE ta.user_id = ? AND t.status IN ('Done', 'done', 'Completed', 'completed')`,
          [userId]
        );
        tasksCompleted = parseInt(completedResult[0]?.count || 0);
        
        // Tasks in progress
        const [inProgressResult] = await pool.execute(
          `SELECT COUNT(DISTINCT ta.task_id) as count 
           FROM task_assignees ta
           JOIN tasks t ON ta.task_id = t.id
           WHERE ta.user_id = ? AND t.status IN ('Doing', 'doing', 'In Progress', 'in progress', 'In progress')`,
          [userId]
        );
        tasksInProgress = parseInt(inProgressResult[0]?.count || 0);
        
        // Tasks pending
        const [pendingResult] = await pool.execute(
          `SELECT COUNT(DISTINCT ta.task_id) as count 
           FROM task_assignees ta
           JOIN tasks t ON ta.task_id = t.id
           WHERE ta.user_id = ? AND t.status IN ('Incomplete', 'incomplete', 'Pending', 'pending', 'To Do', 'to do')`,
          [userId]
        );
        tasksPending = parseInt(pendingResult[0]?.count || 0);
        
        totalTasks = tasksCompleted + tasksInProgress + tasksPending;
      } catch (e) {
        console.log('Error getting task counts:', e.message);
      }
      
      // Get project count
      try {
        const [projectResult] = await pool.execute(
          `SELECT COUNT(DISTINCT pm.project_id) as count 
           FROM project_members pm
           WHERE pm.user_id = ?`,
          [userId]
        );
        projectsAssigned = parseInt(projectResult[0]?.count || 0);
        
        // Also check created_by in projects
        if (projectsAssigned === 0) {
          const [createdProjects] = await pool.execute(
            `SELECT COUNT(*) as count FROM projects WHERE created_by = ?`,
            [userId]
          );
          projectsAssigned = parseInt(createdProjects[0]?.count || 0);
        }
      } catch (e) {
        console.log('Error getting project count:', e.message);
      }
      
      // Get hours logged from time_logs - use 'hours' column
      try {
        const [timeResult] = await pool.execute(
          `SELECT COALESCE(SUM(hours), 0) as total_hours 
           FROM time_logs 
           WHERE user_id = ? AND is_deleted = 0`,
          [userId]
        );
        hoursLogged = Math.round(parseFloat(timeResult[0]?.total_hours || 0) * 10) / 10;
      } catch (e) {
        console.log('Error getting time logs:', e.message);
      }
      
      // Calculate rating
      let rating = 'Average';
      if (tasksCompleted >= 20) rating = 'Excellent';
      else if (tasksCompleted >= 10) rating = 'Good';
      else if (tasksCompleted >= 5) rating = 'Fair';
      
      return {
        id: emp.id,
        user_id: userId,
        name: emp.name || 'Employee',
        email: emp.email || '',
        designation: emp.designation || '',
        department: emp.department || '',
        tasks_completed: tasksCompleted,
        tasks_in_progress: tasksInProgress,
        tasks_pending: tasksPending,
        total_tasks: totalTasks,
        projects_assigned: projectsAssigned,
        hours_logged: hoursLogged,
        rating
      };
    }));
    
    // Sort by tasks completed
    performanceData.sort((a, b) => b.tasks_completed - a.tasks_completed);
    
    // Calculate summary
    const summary = {
      total_employees: performanceData.length,
      excellent: performanceData.filter(e => e.rating === 'Excellent').length,
      good: performanceData.filter(e => e.rating === 'Good').length,
      fair: performanceData.filter(e => e.rating === 'Fair').length,
      average: performanceData.filter(e => e.rating === 'Average').length,
      total_tasks: performanceData.reduce((sum, e) => sum + e.total_tasks, 0),
      total_completed: performanceData.reduce((sum, e) => sum + e.tasks_completed, 0),
      total_projects: performanceData.reduce((sum, e) => sum + e.projects_assigned, 0),
      total_hours: performanceData.reduce((sum, e) => sum + e.hours_logged, 0)
    };
    
    console.log('Employee Performance Data:', performanceData.length, 'employees found');
    
    res.json({
      success: true,
      data: performanceData,
      summary
    });
  } catch (error) {
    console.error('Get employee performance report error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch employee performance report'
    });
  }
};

/**
 * Get All Reports Summary - Dynamic data from all tables
 * GET /api/v1/reports/summary
 */
const getReportsSummary = async (req, res) => {
  try {
    const { company_id } = req.query;
    const filterCompanyId = company_id || req.companyId || 1;
    
    // Get invoice summary
    const [invoices] = await pool.execute(
      `SELECT 
        COUNT(*) as total,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(paid), 0) as total_paid,
        COALESCE(SUM(total - COALESCE(paid, 0)), 0) as total_unpaid
       FROM invoices
       WHERE company_id = ?`,
      [filterCompanyId]
    );
    
    // Get project summary
    const [projects] = await pool.execute(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('Active', 'active', 'In Progress', 'in progress') THEN 1 END) as active,
        COUNT(CASE WHEN status IN ('Completed', 'completed', 'Done', 'done') THEN 1 END) as completed,
        COUNT(CASE WHEN status IN ('On Hold', 'on hold', 'Hold') THEN 1 END) as on_hold
       FROM projects
       WHERE company_id = ?`,
      [filterCompanyId]
    );
    
    // Get task summary
    const [tasks] = await pool.execute(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('Done', 'done', 'Completed', 'completed') THEN 1 END) as completed,
        COUNT(CASE WHEN status IN ('Doing', 'doing', 'In Progress', 'in progress') THEN 1 END) as in_progress,
        COUNT(CASE WHEN status IN ('Incomplete', 'incomplete', 'Pending', 'pending', 'To Do') THEN 1 END) as pending
       FROM tasks
       WHERE company_id = ?`,
      [filterCompanyId]
    );
    
    // Get lead summary
    const [leads] = await pool.execute(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('Won', 'won', 'Converted', 'converted') THEN 1 END) as won,
        COUNT(CASE WHEN status IN ('Lost', 'lost') THEN 1 END) as lost
       FROM leads
       WHERE company_id = ?`,
      [filterCompanyId]
    );
    
    // Get employee count
    const [employees] = await pool.execute(
      `SELECT COUNT(*) as total FROM employees WHERE company_id = ?`,
      [filterCompanyId]
    );
    
    // Get client count
    const [clients] = await pool.execute(
      `SELECT COUNT(*) as total FROM clients WHERE company_id = ?`,
      [filterCompanyId]
    );
    
    res.json({
      success: true,
      data: {
        invoices: invoices[0] || { total: 0, total_revenue: 0, total_paid: 0, total_unpaid: 0 },
        projects: projects[0] || { total: 0, active: 0, completed: 0, on_hold: 0 },
        tasks: tasks[0] || { total: 0, completed: 0, in_progress: 0, pending: 0 },
        leads: leads[0] || { total: 0, won: 0, lost: 0 },
        employees: employees[0] || { total: 0 },
        clients: clients[0] || { total: 0 }
      }
    });
  } catch (error) {
    console.error('Get reports summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch reports summary'
    });
  }
};

/**
 * Get Expenses Summary Report
 * GET /api/v1/reports/expenses-summary
 */
const getExpensesSummary = async (req, res) => {
  try {
    const { company_id, year, start_date, end_date, category, view = 'yearly' } = req.query;
    const filterCompanyId = company_id || req.companyId || 1;
    const filterYear = year || new Date().getFullYear();

    let whereClause = 'WHERE e.company_id = ? AND e.is_deleted = 0';
    const params = [filterCompanyId];

    if (view === 'yearly') {
      whereClause += ' AND YEAR(e.created_at) = ?';
      params.push(filterYear);
    } else if (view === 'custom' && start_date && end_date) {
      whereClause += ' AND DATE(e.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    } else if (view === 'monthly') {
      whereClause += ' AND YEAR(e.created_at) = ?';
      params.push(filterYear);
    }

    if (category) {
      whereClause += ' AND ei.name = ?';
      params.push(category);
    }

    // Get expenses by category
    const [expenses] = await pool.execute(
      `SELECT
        COALESCE(ei.name, 'Uncategorized') as category,
        COUNT(*) as count,
        COALESCE(SUM(e.sub_total), 0) as amount,
        COALESCE(SUM(e.tax_amount), 0) as tax,
        0 as second_tax,
        COALESCE(SUM(e.total), 0) as total
       FROM expenses e
       LEFT JOIN expense_items ei ON e.id = ei.expense_id
       ${whereClause}
       GROUP BY COALESCE(ei.name, 'Uncategorized')
       ORDER BY total DESC`,
      params
    );

    // Get monthly breakdown for chart
    const [monthlyData] = await pool.execute(
      `SELECT
        DATE_FORMAT(e.created_at, '%b') as month,
        DATE_FORMAT(e.created_at, '%Y-%m') as month_key,
        COALESCE(SUM(e.total), 0) as total
       FROM expenses e
       WHERE e.company_id = ? AND e.is_deleted = 0 AND YEAR(e.created_at) = ?
       GROUP BY DATE_FORMAT(e.created_at, '%b'), DATE_FORMAT(e.created_at, '%Y-%m')
       ORDER BY month_key`,
      [filterCompanyId, filterYear]
    );

    // Get category breakdown for pie chart
    const [categoryData] = await pool.execute(
      `SELECT
        COALESCE(ei.name, 'Uncategorized') as name,
        COALESCE(SUM(e.total), 0) as value
       FROM expenses e
       LEFT JOIN expense_items ei ON e.id = ei.expense_id
       WHERE e.company_id = ? AND e.is_deleted = 0 AND YEAR(e.created_at) = ?
       GROUP BY COALESCE(ei.name, 'Uncategorized')
       ORDER BY value DESC
       LIMIT 10`,
      [filterCompanyId, filterYear]
    );

    res.json({
      success: true,
      data: expenses,
      chartData: {
        monthly: monthlyData,
        category: categoryData
      },
      totals: {
        amount: expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0),
        tax: expenses.reduce((sum, e) => sum + parseFloat(e.tax || 0), 0),
        second_tax: 0,
        total: expenses.reduce((sum, e) => sum + parseFloat(e.total || 0), 0)
      }
    });
  } catch (error) {
    console.error('Get expenses summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Invoices Summary Report
 * GET /api/v1/reports/invoices-summary
 */
const getInvoicesSummary = async (req, res) => {
  try {
    const { company_id, year, start_date, end_date, currency, client_id, view = 'yearly' } = req.query;
    const filterCompanyId = company_id || req.companyId || 1;
    const filterYear = year || new Date().getFullYear();

    let whereClause = 'WHERE i.company_id = ? AND i.is_deleted = 0';
    const params = [filterCompanyId];

    if (view === 'yearly') {
      whereClause += ' AND YEAR(i.invoice_date) = ?';
      params.push(filterYear);
    } else if (view === 'custom' && start_date && end_date) {
      whereClause += ' AND DATE(i.invoice_date) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    } else if (view === 'monthly') {
      whereClause += ' AND YEAR(i.invoice_date) = ?';
      params.push(filterYear);
    }

    if (currency) {
      whereClause += ' AND i.currency = ?';
      params.push(currency);
    }

    if (client_id) {
      whereClause += ' AND i.client_id = ?';
      params.push(client_id);
    }

    // Get invoices grouped by client
    const [invoices] = await pool.execute(
      `SELECT
        COALESCE(c.company_name, u.name, 'Unknown Client') as client_name,
        c.id as client_id,
        COUNT(*) as count,
        COALESCE(SUM(i.total), 0) as invoice_total,
        COALESCE(SUM(i.discount_amount), 0) as discount,
        COALESCE(SUM(i.tax_amount), 0) as tax,
        0 as second_tax,
        0 as tds,
        COALESCE(SUM(i.paid), 0) as payment_received,
        COALESCE(SUM(i.unpaid), 0) as due
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN users u ON c.owner_id = u.id
       ${whereClause}
       GROUP BY c.id, COALESCE(c.company_name, u.name, 'Unknown Client')
       ORDER BY invoice_total DESC`,
      params
    );

    res.json({
      success: true,
      data: invoices,
      totals: {
        count: invoices.reduce((sum, i) => sum + parseInt(i.count || 0), 0),
        invoice_total: invoices.reduce((sum, i) => sum + parseFloat(i.invoice_total || 0), 0),
        discount: invoices.reduce((sum, i) => sum + parseFloat(i.discount || 0), 0),
        tax: invoices.reduce((sum, i) => sum + parseFloat(i.tax || 0), 0),
        second_tax: 0,
        tds: 0,
        payment_received: invoices.reduce((sum, i) => sum + parseFloat(i.payment_received || 0), 0),
        due: invoices.reduce((sum, i) => sum + parseFloat(i.due || 0), 0)
      }
    });
  } catch (error) {
    console.error('Get invoices summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Invoice Details Report
 * GET /api/v1/reports/invoice-details
 */
const getInvoiceDetails = async (req, res) => {
  try {
    const { company_id, year, start_date, end_date, currency, client_id, status } = req.query;
    const filterCompanyId = company_id || req.companyId || 1;
    const filterYear = year || new Date().getFullYear();

    let whereClause = 'WHERE i.company_id = ? AND i.is_deleted = 0';
    const params = [filterCompanyId];

    if (year) {
      whereClause += ' AND YEAR(i.invoice_date) = ?';
      params.push(filterYear);
    }

    if (start_date && end_date) {
      whereClause += ' AND DATE(i.invoice_date) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    if (currency) {
      whereClause += ' AND i.currency = ?';
      params.push(currency);
    }

    if (client_id) {
      whereClause += ' AND i.client_id = ?';
      params.push(client_id);
    }

    if (status) {
      whereClause += ' AND i.status = ?';
      params.push(status);
    }

    const [invoices] = await pool.execute(
      `SELECT
        i.id,
        i.invoice_number,
        COALESCE(c.company_name, u.name, 'Unknown Client') as client_name,
        c.vat_number as vat_gst,
        i.invoice_date as bill_date,
        i.due_date,
        i.total as invoice_total,
        i.discount_amount as discount,
        i.tax_amount as tax,
        0 as second_tax,
        0 as tds,
        i.paid as payment_received,
        i.unpaid as due,
        i.status,
        i.currency
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       LEFT JOIN users u ON c.owner_id = u.id
       ${whereClause}
       ORDER BY i.invoice_date DESC`,
      params
    );

    // Calculate dynamic status
    const processedInvoices = invoices.map(inv => {
      let dynamicStatus = inv.status;
      if (inv.due <= 0 && inv.payment_received > 0) {
        dynamicStatus = 'Paid';
      } else if (inv.payment_received > 0 && inv.due > 0) {
        dynamicStatus = 'Partially Paid';
      } else if (new Date(inv.due_date) < new Date() && inv.due > 0) {
        dynamicStatus = 'Overdue';
      } else if (inv.due > 0) {
        dynamicStatus = 'Not Paid';
      }
      return { ...inv, status: dynamicStatus };
    });

    res.json({
      success: true,
      data: processedInvoices,
      totals: {
        invoice_total: invoices.reduce((sum, i) => sum + parseFloat(i.invoice_total || 0), 0),
        discount: invoices.reduce((sum, i) => sum + parseFloat(i.discount || 0), 0),
        tax: invoices.reduce((sum, i) => sum + parseFloat(i.tax || 0), 0),
        payment_received: invoices.reduce((sum, i) => sum + parseFloat(i.payment_received || 0), 0),
        due: invoices.reduce((sum, i) => sum + parseFloat(i.due || 0), 0)
      }
    });
  } catch (error) {
    console.error('Get invoice details error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Income vs Expenses Report
 * GET /api/v1/reports/income-vs-expenses
 */
const getIncomeVsExpenses = async (req, res) => {
  try {
    const { company_id, year, project_id } = req.query;
    const filterCompanyId = company_id || req.companyId || 1;
    const filterYear = year || new Date().getFullYear();

    let projectFilter = '';
    const incomeParams = [filterCompanyId, filterYear];
    const expenseParams = [filterCompanyId, filterYear];

    if (project_id) {
      projectFilter = ' AND project_id = ?';
      incomeParams.push(project_id);
    }

    // Get monthly income from payments
    const [incomeData] = await pool.execute(
      `SELECT
        DATE_FORMAT(paid_on, '%b') as month,
        DATE_FORMAT(paid_on, '%Y-%m') as month_key,
        COALESCE(SUM(amount), 0) as income
       FROM payments
       WHERE company_id = ? AND is_deleted = 0 AND YEAR(paid_on) = ? ${projectFilter}
       GROUP BY DATE_FORMAT(paid_on, '%b'), DATE_FORMAT(paid_on, '%Y-%m')
       ORDER BY month_key`,
      incomeParams
    );

    // Get monthly expenses
    const [expenseData] = await pool.execute(
      `SELECT
        DATE_FORMAT(created_at, '%b') as month,
        DATE_FORMAT(created_at, '%Y-%m') as month_key,
        COALESCE(SUM(total), 0) as expense
       FROM expenses
       WHERE company_id = ? AND is_deleted = 0 AND YEAR(created_at) = ?
       GROUP BY DATE_FORMAT(created_at, '%b'), DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month_key`,
      expenseParams
    );

    // Merge data by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = months.map((month, idx) => {
      const monthKey = `${filterYear}-${String(idx + 1).padStart(2, '0')}`;
      const income = incomeData.find(d => d.month_key === monthKey);
      const expense = expenseData.find(d => d.month_key === monthKey);
      return {
        month,
        income: parseFloat(income?.income || 0),
        expense: parseFloat(expense?.expense || 0)
      };
    });

    const totalIncome = chartData.reduce((sum, d) => sum + d.income, 0);
    const totalExpense = chartData.reduce((sum, d) => sum + d.expense, 0);

    res.json({
      success: true,
      data: chartData,
      summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        profit: totalIncome - totalExpense,
        profit_percentage: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    console.error('Get income vs expenses error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Payments Summary Report
 * GET /api/v1/reports/payments-summary
 */
const getPaymentsSummary = async (req, res) => {
  try {
    const { company_id, year, payment_method, view = 'monthly' } = req.query;
    const filterCompanyId = company_id || req.companyId || 1;
    const filterYear = year || new Date().getFullYear();

    let whereClause = 'WHERE p.company_id = ? AND p.is_deleted = 0 AND YEAR(p.paid_on) = ?';
    const params = [filterCompanyId, filterYear];

    if (payment_method) {
      whereClause += ' AND (p.payment_gateway = ? OR p.offline_payment_method = ?)';
      params.push(payment_method, payment_method);
    }

    if (view === 'monthly') {
      // Monthly summary
      const [payments] = await pool.execute(
        `SELECT
          DATE_FORMAT(p.paid_on, '%b %Y') as period,
          DATE_FORMAT(p.paid_on, '%Y-%m') as month_key,
          COUNT(*) as count,
          COALESCE(SUM(p.amount), 0) as amount
         FROM payments p
         ${whereClause}
         GROUP BY DATE_FORMAT(p.paid_on, '%b %Y'), DATE_FORMAT(p.paid_on, '%Y-%m')
         ORDER BY month_key DESC`,
        params
      );

      res.json({
        success: true,
        data: payments,
        totals: {
          count: payments.reduce((sum, p) => sum + parseInt(p.count || 0), 0),
          amount: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
        }
      });
    } else {
      // Client summary
      const [payments] = await pool.execute(
        `SELECT
          COALESCE(c.company_name, u.name, 'Unknown Client') as client_name,
          c.id as client_id,
          COUNT(*) as count,
          COALESCE(SUM(p.amount), 0) as amount
         FROM payments p
         LEFT JOIN invoices i ON p.invoice_id = i.id
         LEFT JOIN clients c ON i.client_id = c.id
         LEFT JOIN users u ON c.owner_id = u.id
         ${whereClause}
         GROUP BY c.id, COALESCE(c.company_name, u.name, 'Unknown Client')
         ORDER BY amount DESC`,
        params
      );

      res.json({
        success: true,
        data: payments,
        totals: {
          count: payments.reduce((sum, p) => sum + parseInt(p.count || 0), 0),
          amount: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
        }
      });
    }
  } catch (error) {
    console.error('Get payments summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Timesheets Report
 * GET /api/v1/reports/timesheets
 */
const getTimesheetsReport = async (req, res) => {
  try {
    const { company_id, year, start_date, end_date, user_id, project_id, client_id, view = 'details' } = req.query;
    const filterCompanyId = company_id || req.companyId || 1;

    let whereClause = 'WHERE tl.company_id = ? AND tl.is_deleted = 0';
    const params = [filterCompanyId];

    if (start_date && end_date) {
      whereClause += ' AND tl.date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    } else if (year) {
      whereClause += ' AND YEAR(tl.date) = ?';
      params.push(year);
    }

    if (user_id) {
      whereClause += ' AND tl.user_id = ?';
      params.push(user_id);
    }

    if (project_id) {
      whereClause += ' AND tl.project_id = ?';
      params.push(project_id);
    }

    if (client_id) {
      whereClause += ' AND p.client_id = ?';
      params.push(client_id);
    }

    if (view === 'details') {
      const [timeLogs] = await pool.execute(
        `SELECT
          tl.id,
          u.name as member,
          p.project_name as project,
          COALESCE(c.company_name, cu.name, '-') as client,
          t.title as task,
          tl.date as start_time,
          tl.date as end_time,
          tl.hours as total,
          tl.description as note
         FROM time_logs tl
         LEFT JOIN users u ON tl.user_id = u.id
         LEFT JOIN projects p ON tl.project_id = p.id
         LEFT JOIN clients c ON p.client_id = c.id
         LEFT JOIN users cu ON c.owner_id = cu.id
         LEFT JOIN tasks t ON tl.task_id = t.id
         ${whereClause}
         ORDER BY tl.date DESC, tl.id DESC`,
        params
      );

      res.json({
        success: true,
        data: timeLogs,
        totals: {
          total_hours: timeLogs.reduce((sum, t) => sum + parseFloat(t.total || 0), 0),
          total_entries: timeLogs.length
        }
      });
    } else if (view === 'summary') {
      const [summary] = await pool.execute(
        `SELECT
          u.name as member,
          COUNT(*) as entries,
          COALESCE(SUM(tl.hours), 0) as total_hours
         FROM time_logs tl
         LEFT JOIN users u ON tl.user_id = u.id
         LEFT JOIN projects p ON tl.project_id = p.id
         ${whereClause}
         GROUP BY tl.user_id, u.name
         ORDER BY total_hours DESC`,
        params
      );

      res.json({
        success: true,
        data: summary,
        totals: {
          total_hours: summary.reduce((sum, s) => sum + parseFloat(s.total_hours || 0), 0),
          total_entries: summary.reduce((sum, s) => sum + parseInt(s.entries || 0), 0)
        }
      });
    } else if (view === 'daily') {
      const [daily] = await pool.execute(
        `SELECT
          tl.date,
          u.name as member,
          COALESCE(SUM(tl.hours), 0) as total_hours,
          COUNT(*) as entries
         FROM time_logs tl
         LEFT JOIN users u ON tl.user_id = u.id
         LEFT JOIN projects p ON tl.project_id = p.id
         ${whereClause}
         GROUP BY tl.date, tl.user_id, u.name
         ORDER BY tl.date DESC`,
        params
      );

      res.json({
        success: true,
        data: daily,
        totals: {
          total_hours: daily.reduce((sum, d) => sum + parseFloat(d.total_hours || 0), 0),
          total_entries: daily.reduce((sum, d) => sum + parseInt(d.entries || 0), 0)
        }
      });
    } else {
      // Chart view - by project
      const [chartData] = await pool.execute(
        `SELECT
          COALESCE(p.project_name, 'No Project') as name,
          COALESCE(SUM(tl.hours), 0) as value
         FROM time_logs tl
         LEFT JOIN projects p ON tl.project_id = p.id
         ${whereClause}
         GROUP BY tl.project_id, p.project_name
         ORDER BY value DESC
         LIMIT 10`,
        params
      );

      res.json({
        success: true,
        data: chartData,
        totals: {
          total_hours: chartData.reduce((sum, c) => sum + parseFloat(c.value || 0), 0)
        }
      });
    }
  } catch (error) {
    console.error('Get timesheets report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get Projects Report - Team Members & Clients Summary
 * GET /api/v1/reports/projects-summary
 */
const getProjectsReport = async (req, res) => {
  try {
    const { company_id, start_date, end_date, view = 'team' } = req.query;
    const filterCompanyId = company_id || req.companyId || 1;

    let dateFilter = '';
    const params = [filterCompanyId];

    if (start_date && end_date) {
      dateFilter = ' AND p.created_at BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    if (view === 'team') {
      // Team Members Summary
      const [teamData] = await pool.execute(
        `SELECT
          u.id as user_id,
          u.name as team_member,
          COUNT(DISTINCT CASE WHEN p.status IN ('in progress', 'In Progress', 'Active') THEN p.id END) as open_projects,
          COUNT(DISTINCT CASE WHEN p.status IN ('completed', 'Completed', 'Done') THEN p.id END) as completed_projects,
          COUNT(DISTINCT CASE WHEN p.status IN ('on hold', 'On Hold', 'Hold') THEN p.id END) as hold_projects,
          (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t ON ta.task_id = t.id
           WHERE ta.user_id = u.id AND t.status NOT IN ('Done', 'done', 'Completed')) as open_tasks,
          (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t ON ta.task_id = t.id
           WHERE ta.user_id = u.id AND t.status IN ('Done', 'done', 'Completed')) as completed_tasks,
          COALESCE((SELECT SUM(hours) FROM time_logs WHERE user_id = u.id AND is_deleted = 0), 0) as total_time_logged
         FROM users u
         LEFT JOIN project_members pm ON u.id = pm.user_id
         LEFT JOIN projects p ON pm.project_id = p.id ${dateFilter}
         WHERE u.company_id = ? AND u.is_deleted = 0
         GROUP BY u.id, u.name
         HAVING open_projects > 0 OR completed_projects > 0 OR open_tasks > 0 OR completed_tasks > 0
         ORDER BY open_projects DESC`,
        [...params, filterCompanyId]
      );

      res.json({
        success: true,
        data: teamData,
        totals: {
          open_projects: teamData.reduce((sum, t) => sum + parseInt(t.open_projects || 0), 0),
          completed_projects: teamData.reduce((sum, t) => sum + parseInt(t.completed_projects || 0), 0),
          hold_projects: teamData.reduce((sum, t) => sum + parseInt(t.hold_projects || 0), 0),
          open_tasks: teamData.reduce((sum, t) => sum + parseInt(t.open_tasks || 0), 0),
          completed_tasks: teamData.reduce((sum, t) => sum + parseInt(t.completed_tasks || 0), 0),
          total_time_logged: teamData.reduce((sum, t) => sum + parseFloat(t.total_time_logged || 0), 0)
        }
      });
    } else {
      // Clients Summary
      const [clientData] = await pool.execute(
        `SELECT
          COALESCE(c.company_name, cu.name, 'No Client') as client_name,
          c.id as client_id,
          COUNT(DISTINCT CASE WHEN p.status IN ('in progress', 'In Progress', 'Active') THEN p.id END) as open_projects,
          COUNT(DISTINCT CASE WHEN p.status IN ('completed', 'Completed', 'Done') THEN p.id END) as completed_projects,
          COUNT(DISTINCT CASE WHEN p.status IN ('on hold', 'On Hold', 'Hold') THEN p.id END) as hold_projects,
          COALESCE(SUM(p.budget), 0) as total_budget
         FROM projects p
         LEFT JOIN clients c ON p.client_id = c.id
         LEFT JOIN users cu ON c.owner_id = cu.id
         WHERE p.company_id = ? AND p.is_deleted = 0 ${dateFilter}
         GROUP BY c.id, COALESCE(c.company_name, cu.name, 'No Client')
         ORDER BY open_projects DESC`,
        params
      );

      res.json({
        success: true,
        data: clientData,
        totals: {
          open_projects: clientData.reduce((sum, c) => sum + parseInt(c.open_projects || 0), 0),
          completed_projects: clientData.reduce((sum, c) => sum + parseInt(c.completed_projects || 0), 0),
          hold_projects: clientData.reduce((sum, c) => sum + parseInt(c.hold_projects || 0), 0),
          total_budget: clientData.reduce((sum, c) => sum + parseFloat(c.total_budget || 0), 0)
        }
      });
    }
  } catch (error) {
    console.error('Get projects report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getSalesReport,
  getRevenueReport,
  getProjectStatusReport,
  getEmployeePerformanceReport,
  getReportsSummary,
  getExpensesSummary,
  getInvoicesSummary,
  getInvoiceDetails,
  getIncomeVsExpenses,
  getPaymentsSummary,
  getTimesheetsReport,
  getProjectsReport
};
