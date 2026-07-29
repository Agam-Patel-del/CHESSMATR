import React from 'react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../app/routes/paths';
import './LandingPage.css';

export const LandingPage = () => {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <p className="landing-logo">ChessMatr</p>
        <nav className="landing-nav">
          <Link to={PATHS.LOGIN} className="landing-nav-link">Log in</Link>
          <Link to={PATHS.REGISTER} className="landing-nav-cta">Sign up</Link>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-content">
            <h1>Every move matters.</h1>
            <p>
              Play real-time chess with a clean board and simple matchmaking. 
              No clutter, no distractions — just you, the game, and the opponent.
            </p>
            <Link to={PATHS.LOGIN} className="landing-btn">Start playing</Link>
          </div>
          <div className="landing-hero-image-container">
            <img
              src="/images/ChessmatrLandingImage.png"
              alt="A screenshot of an active chess game on our platform"
              className="landing-hero-image"
            />
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} ChessMatr. All rights reserved.</p>
      </footer>
    </div>
  );
};