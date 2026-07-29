import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import { PATHS } from "../../app/routes/paths";

export const ForgotPasswordPage = () => {
  const { sendResetLink } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await sendResetLink(email);
      setIsSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="auth-title">Reset your password</h2>
      {!isSubmitted ? (
        <>
          <p className="auth-subtitle">
            Enter your email address below to get the reset password link
          </p>

          <form onSubmit={handleSubmit}>
            <div className="auth-form-group">
              <label className="auth-label" htmlFor="email">
                Your email address
              </label>
              <input
                type="email"
                id="email"
                className="auth-input"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. you@example.com"
                disabled={isSubmitting}
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button
              type="submit"
              className="auth-submit-btn"
              style={{ marginTop: "8px" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      ) : (
        <div style={{ margin: "24px 0", textAlign: "center" }}>
          <p
            style={{
              fontSize: "0.95rem",
              color: "#5C504D",
              marginBottom: "24px",
            }}
          >
            We've sent a link to reset your password to <strong>{email}</strong>
            . Please check your inbox and spam folders.
          </p>
        </div>
      )}

      <div className="auth-footer">
        Remember your password?
        <Link to={PATHS.LOGIN} className="auth-link">
          Log in
        </Link>
      </div>
    </div>
  );
};
