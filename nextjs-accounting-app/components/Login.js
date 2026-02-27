'use client'

import { useState } from 'react'
import styles from './Login.module.css'
import * as api from '@/lib/api'

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    <div className={styles.loginOverlay}>
      <div className={styles.loginBox}>
        <div className={styles.loginLogo}>
          <i className="fas fa-calculator"></i>
          <h1>EasyAccount</h1>
          <p>Accounting & ERP System</p>
        </div>

        <div className={styles.tabRow}>
          <button
            className={`${styles.tab} ${mode === 'login' ? styles.activeTab : ''}`}
            onClick={() => { setMode('login'); setError('') }}
          >
            Sign In
          </button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.activeTab : ''}`}
            onClick={() => { setMode('register'); setError('') }}
          >
            Register
          </button>
        </div>

        {error && <div className={styles.errorMsg}><i className="fas fa-exclamation-circle"></i> {error}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Email</label>
              <div className={styles.inputWrapper}>
                <i className="fas fa-envelope"></i>
                <input
                  type="email"
                  name="email"
                  placeholder="you@company.com"
                  value={loginForm.email}
                  onChange={handleLoginChange}
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Password</label>
              <div className={styles.inputWrapper}>
                <i className="fas fa-lock"></i>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? <><i className="fas fa-spinner fa-spin"></i> Signing in...</> : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Company Name *</label>
              <div className={styles.inputWrapper}>
                <i className="fas fa-building"></i>
                <input
                  type="text"
                  name="company_name"
                  placeholder="Acme Corp"
                  value={regForm.company_name}
                  onChange={handleRegChange}
                  required
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>First Name</label>
                <div className={styles.inputWrapper}>
                  <i className="fas fa-user"></i>
                  <input
                    type="text"
                    name="first_name"
                    placeholder="John"
                    value={regForm.first_name}
                    onChange={handleRegChange}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Last Name</label>
                <div className={styles.inputWrapper}>
                  <i className="fas fa-user"></i>
                  <input
                    type="text"
                    name="last_name"
                    placeholder="Doe"
                    value={regForm.last_name}
                    onChange={handleRegChange}
                  />
                </div>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Username *</label>
              <div className={styles.inputWrapper}>
                <i className="fas fa-at"></i>
                <input
                  type="text"
                  name="username"
                  placeholder="johndoe"
                  value={regForm.username}
                  onChange={handleRegChange}
                  required
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Email *</label>
              <div className={styles.inputWrapper}>
                <i className="fas fa-envelope"></i>
                <input
                  type="email"
                  name="email"
                  placeholder="you@company.com"
                  value={regForm.email}
                  onChange={handleRegChange}
                  required
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Password *</label>
              <div className={styles.inputWrapper}>
                <i className="fas fa-lock"></i>
                <input
                  type="password"
                  name="password"
                  placeholder="Min 6 characters"
                  value={regForm.password}
                  onChange={handleRegChange}
                  required
                  minLength={6}
                />
              </div>
            </div>
            <button type="submit" className={styles.btnPrimary} disabled={loading}>
              {loading ? <><i className="fas fa-spinner fa-spin"></i> Creating account...</> : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
