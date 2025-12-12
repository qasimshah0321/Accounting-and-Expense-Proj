'use client'

import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import styles from './Dashboard.module.css'

// Sample data for charts
const salesData = [
  { month: 'Mar', amount: 50000 },
  { month: 'Apr', amount: 75000 },
  { month: 'May', amount: 120000 },
  { month: 'Jun', amount: 95000 },
  { month: 'Jul', amount: 180000 },
  { month: 'Aug', amount: 220000 },
  { month: 'Sep', amount: 185000 },
  { month: 'Oct', amount: 155000 },
  { month: 'Nov', amount: 210000 },
  { month: 'Dec', amount: 250000 },
]

const expensesData = [
  { name: 'Agency Fees', value: 35, color: '#1E3A8A' },
  { name: 'General Administrative Expenses', value: 28, color: '#3B82F6' },
  { name: 'Payroll Expenses', value: 22, color: '#8B5CF6' },
  { name: 'Sales', value: 15, color: '#06B6D4' },
]

const receivableData = [
  { name: 'CURRENT', value: 45, color: '#10B981' },
  { name: '1-30', value: 20, color: '#3B82F6' },
  { name: '31-60', value: 15, color: '#8B5CF6' },
  { name: '61-90', value: 12, color: '#06B6D4' },
  { name: '91 AND OVER', value: 8, color: '#F59E0B' },
]

const payableData = [
  { name: 'CURRENT', value: 50, color: '#10B981' },
  { name: '1-30', value: 22, color: '#3B82F6' },
  { name: '31-60', value: 18, color: '#8B5CF6' },
  { name: '61-90', value: 7, color: '#06B6D4' },
  { name: '91 AND OVER', value: 3, color: '#F59E0B' },
]

export default function Dashboard() {
  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardHeader}>
        <h2>Business at a glance</h2>
      </div>

      <div className={styles.dashboardGrid}>
        {/* Profit & Loss Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3>PROFIT & LOSS</h3>
              <p className={styles.cardSubtitle}>Net profit for November</p>
            </div>
            <select className={styles.dropdown}>
              <option>Last month</option>
            </select>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.mainStat}>
              <span className={styles.amount}>$55,958</span>
              <span className={styles.percentage}>
                <i className="fas fa-circle"></i> 100%
              </span>
            </div>
            <div className={styles.trend}>
              <i className="fas fa-arrow-up"></i> Up 124% from prior month
            </div>
            <div className={styles.barChart}>
              <div className={styles.barItem}>
                <span className={styles.barLabel}>$224,609</span>
                <div className={styles.barWrapper}>
                  <div className={styles.barIncome} style={{width: '80%'}}></div>
                </div>
                <span className={styles.barCategory}>Income</span>
              </div>
              <div className={styles.barItem}>
                <span className={styles.barLabel}>$168,652</span>
                <div className={styles.barWrapper}>
                  <div className={styles.barExpense} style={{width: '60%'}}></div>
                </div>
                <span className={styles.barCategory}>Expenses</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3>EXPENSES</h3>
              <p className={styles.cardSubtitle}>Spending for last 30 days</p>
            </div>
            <select className={styles.dropdown}>
              <option>Last 30 days</option>
            </select>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.mainStat}>
              <span className={styles.amount}>-$1,272</span>
              <span className={styles.percentage}>
                <i className="fas fa-circle"></i> 99%
              </span>
            </div>
            <div className={styles.trendDown}>
              <i className="fas fa-arrow-down"></i> Down 100% from prior 30 days
            </div>
            <div className={styles.donutChart}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={expensesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expensesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.legend}>
                {expensesData.map((item, index) => (
                  <div key={index} className={styles.legendItem}>
                    <span className={styles.legendDot} style={{backgroundColor: item.color}}></span>
                    <span className={styles.legendText}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Invoices Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>INVOICES</h3>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.invoiceSection}>
              <div className={styles.invoiceHeader}>
                <span>$768,919 Unpaid</span>
                <span>Last 365 days</span>
              </div>
              <div className={styles.invoiceAmount}>$563,901</div>
              <div className={styles.invoiceLabel}>Overdue</div>
              <div className={styles.progressBar}>
                <div className={styles.progressOverdue} style={{width: '73%'}}></div>
              </div>
            </div>
            <div className={styles.invoiceSection}>
              <div className={styles.invoiceHeader}>
                <span>$65,745 Paid</span>
                <span>Last 30 days</span>
              </div>
              <div className={styles.invoiceAmount}>$0</div>
              <div className={styles.invoiceLabel}>Not deposited</div>
              <div className={styles.progressBar}>
                <div className={styles.progressPaid} style={{width: '100%'}}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Accounts Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3>BANK ACCOUNTS</h3>
              <p className={styles.cardSubtitle}>Today's bank balance</p>
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.mainStat}>
              <span className={styles.amount}>$160,914</span>
              <i className="fas fa-info-circle" style={{color: '#3B82F6', fontSize: '16px'}}></i>
            </div>
            <div className={styles.accountsList}>
              <div className={styles.accountItem}>
                <div className={styles.accountInfo}>
                  <i className="fas fa-university" style={{color: '#3B82F6'}}></i>
                  <div>
                    <div className={styles.accountName}>101100 Checking</div>
                    <div className={styles.accountBank}>In QuickBooks</div>
                  </div>
                </div>
                <div className={styles.accountBalance}>$0</div>
              </div>
              <div className={styles.accountItem}>
                <div className={styles.accountInfo}>
                  <i className="fas fa-university" style={{color: '#3B82F6'}}></i>
                  <div>
                    <div className={styles.accountName}>101000 Business Adv Relat...</div>
                    <div className={styles.accountBank}>Bank balance in QuickBooks</div>
                    <div className={styles.accountUpdate}>Updated 12 hours ago</div>
                  </div>
                </div>
                <div className={styles.accountBalance}>
                  <div>$160,914.25</div>
                  <div className={styles.accountSecondary}>$117,744.70</div>
                  <div className={styles.accountReview}>17 to review</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3>SALES</h3>
              <p className={styles.cardSubtitle}>Total Amount</p>
            </div>
            <select className={styles.dropdown}>
              <option>This year to date</option>
            </select>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.mainStat}>
              <span className={styles.amount}>$1,059,402</span>
            </div>
            <div className={styles.lineChart}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={salesData}>
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Accounts Receivable Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3>ACCOUNTS RECEIVABLE</h3>
              <p className={styles.cardSubtitle}>Total</p>
            </div>
            <select className={styles.dropdown}>
              <option>As of today</option>
            </select>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.mainStat}>
              <span className={styles.amount}>$768,511</span>
            </div>
            <div className={styles.donutChart}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={receivableData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {receivableData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.legend}>
                {receivableData.map((item, index) => (
                  <div key={index} className={styles.legendItem}>
                    <span className={styles.legendDot} style={{backgroundColor: item.color}}></span>
                    <span className={styles.legendText}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Accounts Payable Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3>ACCOUNTS PAYABLE</h3>
              <p className={styles.cardSubtitle}>Total</p>
            </div>
            <select className={styles.dropdown}>
              <option>As of today</option>
            </select>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.mainStat}>
              <span className={styles.amount}>$648,733</span>
            </div>
            <div className={styles.donutChart}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={payableData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {payableData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.legend}>
                {payableData.map((item, index) => (
                  <div key={index} className={styles.legendItem}>
                    <span className={styles.legendDot} style={{backgroundColor: item.color}}></span>
                    <span className={styles.legendText}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* My Integrations Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3>MY INTEGRATIONS</h3>
              <p className={styles.cardSubtitle}>Total</p>
            </div>
            <select className={styles.dropdown}>
              <option>As of today</option>
            </select>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.mainStat}>
              <span className={styles.amount}>2</span>
            </div>
            <div className={styles.integrationStatus}>
              <i className="fas fa-check-circle" style={{color: '#10B981'}}></i>
              <span>Connected</span>
              <span className={styles.integrationCount}>2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
