import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import { PATHS } from "../../app/routes/paths";

export const LoginPage = () => {
  const { login, resendOtp } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendOTP = async (email) => {
    try {
      await resendOtp(email)
    } catch (error) {
      console.log(error || "otp sending failed");
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(identifier, password);
      navigate(PATHS.LOBBY);
    } catch (err) {
      setError(err.message);
      if (err.status === 403 && err.email) {
        sendOTP(err.email);
        navigate(`${PATHS.VERIFY}?email=${encodeURIComponent(err.email)}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="auth-title">Welcome back</h2>
      <p className="auth-subtitle">
        Enter your details below to get back.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="auth-form-group">
          <label className="auth-label" htmlFor="identifier">
            Username or email
          </label>
          <input
            type="text"
            id="identifier"
            className="auth-input"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g. alexChess or alex@example.com"
            disabled={isSubmitting}
          />
        </div>

        <div className="auth-form-group">
          <label className="auth-label" htmlFor="password">
            Password
          </label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              className="auth-input"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="auth-actions">
          <Link to={PATHS.FORGOT} className="auth-forgot-link">
            Forgot password?
          </Link>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button
          type="submit"
          className="auth-submit-btn"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="auth-footer">
        Don't have an account yet?
        <Link to={PATHS.REGISTER} className="auth-link">
          Sign up
        </Link>
      </div>
    </div>
  );
};
