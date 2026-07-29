import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import { PATHS } from "../../app/routes/paths";

export const VerifyEmailPage = () => {
  const { verifyEmail, resendOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      await verifyEmail(email, otp);
      navigate(PATHS.LOBBY);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    setIsResending(true);

    try {
      const data = await resendOtp(email);
      setMessage(data.message || "A new code has been sent to your email.");
      setCountdown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsResending(false);
    }
  };

  const resendingDisabled = isResending || isSubmitting || countdown > 0;

  return (
    <div>
      <h2 className="auth-title">Verify your email</h2>
      <p className="auth-subtitle">
        We've sent a 6-digit verification code to <strong>{email}</strong>.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="auth-form-group">
          <label className="auth-label" htmlFor="otp">
            Verification Code
          </label>
          <input
            type="text"
            id="otp"
            className="auth-input"
            required
            maxLength={6}
            pattern="\d{6}"
            placeholder="e.g. 123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            disabled={isSubmitting}
            style={{
              textAlign: "center",
              fontSize: "1.25rem",
              letterSpacing: "4px",
            }}
          />
        </div>

        {error && <p className="auth-error">{error}</p>}
        {message && (
          <p
            style={{
              color: "#2E7D32",
              fontSize: "0.875rem",
              marginBottom: "16px",
              padding: "10px 14px",
              backgroundColor: "#E8F5E9",
              border: "1px solid #C8E6C9",
              borderRadius: "4px",
            }}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          className="auth-submit-btn"
          disabled={isSubmitting || otp.length !== 6}
        >
          {isSubmitting ? "Verifying…" : "Verify Account"}
        </button>
      </form>

      <div style={{ marginTop: "16px", textAlign: "center" }}>
        <button
          onClick={handleResend}
          disabled={resendingDisabled}
          style={{
            background: "none",
            border: "none",
            color: resendingDisabled ? "#A89585" : "#5C4033",
            cursor: resendingDisabled ? "not-allowed" : "pointer",
            fontSize: "0.9rem",
            fontWeight: "500",
            textDecoration: resendingDisabled ? "none" : "underline",
          }}
        >
          {isResending
            ? "Resending code…"
            : countdown > 0
              ? `Resend code in ${countdown}s`
              : "Resend code"}
        </button>
      </div>

      <div className="auth-footer">
        Back to
        <Link to={PATHS.LOGIN} className="auth-link">
          Log in
        </Link>
      </div>
    </div>
  );
};
