'use client'

import { useState } from 'react'
import styles from './Login.module.css'
import * as api from '@/lib/api'

const getStrength = (pwd) => {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
};

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [regForm, setRegForm] = useState({
    company_name: '',
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  })

  const handleLoginChange = (e) =>
    setLoginForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleRegChange = (e) =>
    setRegForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.login(loginForm.email, loginForm.password)
      const token = res.data?.token || res.token
      const user = res.data?.user || res.user
      localStorage.setItem('auth_token', token)
      onLogin(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (confirmPassword !== regForm.password) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    try {
      const res = await api.register(
        regForm.company_name,
        regForm.username,
        regForm.email,
        regForm.password,
        regForm.first_name,
        regForm.last_name
      )
      const token = res.data?.token || res.token
      const user = res.data?.user || res.user
      localStorage.setItem('auth_token', token)
      onLogin(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* LEFT PANEL */}
      <div className={styles.leftPanel}>
        <div className={styles.brandContent}>
          <div className={styles.logoArea}>
            <i className="fas fa-chart-line" style={{fontSize:'48px',color:'white',marginBottom:'16px'}} />
            <h1 className={styles.appName}>ZeroPoint</h1>
            <p className={styles.tagline}>Professional Accounting for Modern Business</p>
          </div>
          <ul className={styles.featureList}>
            {['Smart Invoicing & Billing','Real-time Financial Reports','Vendor & Customer Management','Purchase Orders & Estimates'].map(f => (
              <li key={f} className={styles.featureItem}>
                <i className="fas fa-check-circle" style={{color:'rgba(255,255,255,0.9)',marginRight:'10px'}} />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className={styles.rightPanel}>
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>

          {/* Tab switcher */}
          <div className={styles.tabBar}>
            <button className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`} onClick={() => { setMode('login'); setError('') }}>Sign In</button>
            <button className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`} onClick={() => { setMode('register'); setError('') }}>Register</button>
          </div>

          {/* SIGN IN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className={styles.form}>
              <div className={styles.field}>
                <label>Email</label>
                <div className={styles.inputIcon}>
                  <i className="fas fa-envelope" />
                  <input type="email" name="email" value={loginForm.email} onChange={handleLoginChange} placeholder="you@company.com" required />
                </div>
              </div>
              <div className={styles.field}>
                <label>Password</label>
                <div className={styles.inputIcon}>
                  <i className="fas fa-lock" />
                  <input type={showPassword ? 'text' : 'password'} name="password" value={loginForm.password} onChange={handleLoginChange} placeholder="••••••••" required />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(p => !p)}>
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              </div>
              {error && <div className={styles.errorMsg}>{error}</div>}
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? <><i className="fas fa-spinner fa-spin" /> Signing In...</> : 'Sign In'}
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className={styles.form}>
              <div className={styles.sectionLabel}>Account</div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <label>First Name</label>
                  <input name="first_name" value={regForm.first_name} onChange={handleRegChange} placeholder="John" required />
                </div>
                <div className={styles.field}>
                  <label>Last Name</label>
                  <input name="last_name" value={regForm.last_name} onChange={handleRegChange} placeholder="Doe" required />
                </div>
              </div>
              <div className={styles.field}>
                <label>Email</label>
                <div className={styles.inputIcon}>
                  <i className="fas fa-envelope" />
                  <input type="email" name="email" value={regForm.email} onChange={handleRegChange} placeholder="you@company.com" required />
                </div>
              </div>
              <div className={styles.field}>
                <label>Password</label>
                <div className={styles.inputIcon}>
                  <i className="fas fa-lock" />
                  <input type={showPassword ? 'text' : 'password'} name="password" value={regForm.password} onChange={handleRegChange} placeholder="Min. 8 characters" required />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(p => !p)}>
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
                {/* Strength bar */}
                <div className={styles.strengthBar}>
                  {[0,1,2,3].map(i => <div key={i} className={`${styles.strengthSeg} ${getStrength(regForm.password) > i ? styles['strength'+getStrength(regForm.password)] : ''}`} />)}
                </div>
              </div>
              <div className={styles.field}>
                <label>Confirm Password</label>
                <div className={styles.inputIcon}>
                  <i className="fas fa-lock" />
                  <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" required />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(p => !p)}>
                    <i className={`fas ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              </div>
              <div className={styles.sectionDivider} />
              <div className={styles.sectionLabel}>Company</div>
              <div className={styles.field}>
                <label>Company Name</label>
                <div className={styles.inputIcon}>
                  <i className="fas fa-building" />
                  <input name="company_name" value={regForm.company_name} onChange={handleRegChange} placeholder="Acme Corp" required />
                </div>
              </div>
              {error && <div className={styles.errorMsg}>{error}</div>}
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? <><i className="fas fa-spinner fa-spin" /> Creating Account...</> : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
