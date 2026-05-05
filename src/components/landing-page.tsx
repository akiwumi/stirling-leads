"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, X } from "lucide-react";
import { signIn } from "@/app/login/actions";
import { getPricingSummary } from "@/lib/pricing";

export function LandingPage({
  error,
  isLoggedIn,
  reset,
}: {
  error?: string;
  isLoggedIn: boolean;
  reset?: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const pricing = getPricingSummary();

  useEffect(() => {
    if (error) setModalOpen(true);
  }, [error]);

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => emailRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  return (
    <>
      <style>{landingCSS}</style>

      {/* Sign-in modal */}
      {modalOpen && (
        <div className="lp-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="lp-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lp-modal-close" onClick={() => setModalOpen(false)} aria-label="Close">
              <X size={18} />
            </button>

            <div className="lp-modal-header">
              <div className="lp-modal-logo">
                <svg viewBox="0 0 18 18" fill="none" width="20" height="20">
                  <path d="M3 3h5v5H3V3zm7 0h5v5h-5V3zm0 7h5v5h-5v-5zm-7 0h5v5H3v-5z" fill="white" opacity="0.9" />
                </svg>
              </div>
              <h2 className="lp-modal-title">
                {isLoggedIn ? "Welcome back" : "Sign in to your workspace"}
              </h2>
              <p className="lp-modal-sub">
                {isLoggedIn
                  ? "Your session is active."
                  : "Enter your credentials to access leads, scoring, and outreach."}
              </p>
            </div>

            {isLoggedIn ? (
              <div className="lp-modal-body">
                <div className="lp-info-box">You are already signed in.</div>
                <a href="/dashboard" className="lp-btn-submit" style={{ textAlign: "center", textDecoration: "none" }}>
                  Go to dashboard →
                </a>
              </div>
            ) : (
              <form action={signIn} className="lp-modal-body">
                {error && (
                  <div className="lp-error">
                    {error === "missing_credentials"
                      ? "Enter both email and password."
                      : error === "confirm_email"
                        ? "Verify your email before signing in."
                        : error === "invalid_confirmation_link"
                          ? "That email link is invalid or expired."
                          : "Login failed. Check your credentials."}
                  </div>
                )}
                {reset === "done" ? <div className="lp-info-box">Password updated. Sign in with the new password.</div> : null}
                <div className="lp-field">
                  <label htmlFor="lp-email">Email</label>
                  <input
                    ref={emailRef}
                    id="lp-email"
                    name="email"
                    type="email"
                    placeholder="name@company.com"
                    required
                    className="lp-input"
                  />
                </div>
                <div className="lp-field">
                  <label htmlFor="lp-password">Password</label>
                  <input
                    id="lp-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="lp-input"
                  />
                </div>
                <button type="submit" className="lp-btn-submit">
                  Enter dashboard
                  <ArrowRight size={16} />
                </button>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                  <a href="/reset-password" style={{ color: "#4f46e5", textDecoration: "none" }}>Forgot password?</a>
                  <a href="/register" style={{ color: "#111827", textDecoration: "none", fontWeight: 600 }}>Create account</a>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* PAGE */}
      <div className="lp-root">

        {/* NAV */}
        <nav className="lp-nav" aria-label="Main navigation">
          <a href="/" className="lp-logo">
            <div className="lp-logo-icon">
              <svg viewBox="0 0 18 18" fill="none" width="18" height="18">
                <path d="M3 3h5v5H3V3zm7 0h5v5h-5V3zm0 7h5v5h-5v-5zm-7 0h5v5H3v-5z" fill="white" opacity="0.9" />
              </svg>
            </div>
            <span className="lp-logo-text">Stirling Market Leads</span>
          </a>

          <ul className="lp-nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#showcase">How it works</a></li>
            <li><a href="#pricing">Pricing</a></li>
          </ul>

          <div className="lp-nav-actions">
            {isLoggedIn ? (
              <a className="lp-btn-primary lp-btn-dashboard" href="/dashboard">Dashboard →</a>
            ) : (
              <>
                <button className="lp-btn-ghost" onClick={() => setModalOpen(true)}>Sign In</button>
                <a className="lp-btn-primary" href="/register">Get started →</a>
              </>
            )}
          </div>
        </nav>

        {/* HERO */}
        <main>
        <section className="lp-hero">
          <div className="lp-orb lp-orb-1" />
          <div className="lp-orb lp-orb-2" />
          <div className="lp-orb lp-orb-3" />

          <div className="lp-hero-left">
            <div className="lp-badge lp-anim lp-anim-d0">
              <span className="lp-badge-dot" />
              AI-powered lead prospecting
            </div>

            <h1 className="lp-hero-headline lp-anim lp-anim-d1">
              Find the right leads.<br />Start <em>better</em> conversations.
            </h1>

            <p className="lp-hero-sub lp-anim lp-anim-d2">
              Stirling surfaces local businesses, scores QR-code opportunities, and keeps your outreach pipeline moving without the manual grind.
            </p>

            <div className="lp-hero-actions lp-anim lp-anim-d3">
              {isLoggedIn ? (
                <a className="lp-btn-hero-primary lp-btn-hero-dashboard" href="/dashboard">
                  Dashboard
                  <ArrowRight size={16} />
                </a>
              ) : (
                <a className="lp-btn-hero-primary" href="/register">
                  Start free {pricing.trialDays}-day trial
                  <ArrowRight size={16} />
                </a>
              )}
              <a href="#showcase" className="lp-btn-hero-secondary">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 8a6 6 0 11-12 0 6 6 0 0112 0z" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M10 8L6.5 6v4L10 8z" fill="currentColor" />
                </svg>
                See how it works
              </a>
            </div>

            <div className="lp-social-proof lp-anim lp-anim-d4">
              <div className="lp-avatars">
                {["A","B","C","D","E"].map((l, i) => (
                  <div key={i} className="lp-avatar" style={{ background: ["#7B5FFF","#3DFFB0","#FF4D6D","#FFB830","#7B5FFF"][i], color: i === 1 || i === 3 ? "#050508" : "#fff" }}>{l}</div>
                ))}
              </div>
              <div className="lp-social-text">
                <strong>500+</strong> sales reps & agencies<br />already using Stirling
              </div>
            </div>
          </div>

          <div className="lp-hero-right lp-anim lp-anim-d2">
            <div className="lp-hero-visual">
              <div className="lp-float-badge lp-float-top">
                <div className="lp-float-icon lp-icon-mint">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 10l4-4 3 3 5-6" stroke="#3DFFB0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div className="lp-float-text">
                  <span className="lp-float-label">Lead quality</span>
                  <span className="lp-float-val">↑ 3.4× better</span>
                </div>
              </div>

              <div className="lp-ui-card">
                <div className="lp-ui-header">
                  <span className="lp-dot lp-dot-r" /><span className="lp-dot lp-dot-y" /><span className="lp-dot lp-dot-g" />
                  <span className="lp-ui-title">stirling — leads.dashboard</span>
                </div>
                <div className="lp-app-layout">
                  <div className="lp-sidebar">
                    <div className="lp-sidebar-label">Workspace</div>
                    {["Dashboard","Leads","Scoring","Outreach","Analytics"].map((item, i) => (
                      <div key={i} className={`lp-sidebar-item${i === 0 ? " lp-active" : ""}`}>
                        <span className="lp-sidebar-dot" style={{ background: i === 0 ? "#7B5FFF" : undefined }} />
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="lp-main">
                    <div className="lp-main-title">Lead Overview</div>
                    <div className="lp-metric-row">
                      <div className="lp-metric">
                        <div className="lp-metric-label">Total leads</div>
                        <div className="lp-metric-value">1,284</div>
                        <div className="lp-progress"><div className="lp-progress-fill" style={{ width: "72%" }} /></div>
                      </div>
                      <div className="lp-metric">
                        <div className="lp-metric-label">High score</div>
                        <div className="lp-metric-value lp-mint">87%</div>
                        <div className="lp-progress"><div className="lp-progress-fill" style={{ width: "87%" }} /></div>
                      </div>
                    </div>
                    <div className="lp-bars">
                      {[40,65,45,90,70,55,85,60].map((h, i) => (
                        <div key={i} className="lp-bar" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                    <div className="lp-metric-row">
                      <div className="lp-metric">
                        <div className="lp-metric-label">Contacted</div>
                        <div className="lp-metric-value">248</div>
                      </div>
                      <div className="lp-metric">
                        <div className="lp-metric-label">Replies</div>
                        <div className="lp-metric-value lp-coral">64</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lp-float-badge lp-float-bottom">
                <div className="lp-float-icon lp-icon-violet">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" fill="#A38BFF" /><rect x="9" y="2" width="5" height="5" rx="1" fill="#A38BFF" opacity="0.5" /><rect x="2" y="9" width="5" height="5" rx="1" fill="#A38BFF" opacity="0.5" /><rect x="9" y="9" width="5" height="5" rx="1" fill="#A38BFF" /></svg>
                </div>
                <div className="lp-float-text">
                  <span className="lp-float-label">AI scoring active</span>
                  <span className="lp-float-val" style={{ color: "#A38BFF" }}>Real-time</span>
                </div>
              </div>
            </div>
          </div>

        </section>

        {/* FEATURES BENTO */}
        <section className="lp-section" id="features">
          <div className="lp-section-header">
            <div className="lp-section-label">Platform Features</div>
            <h2 className="lp-section-title">Move fast, stay <em>aligned</em>,<br />and close more deals</h2>
            <p className="lp-section-sub">Everything you need to find, score, and reach out to local businesses — in one clean workspace.</p>
          </div>

          <div className="lp-bento">
            <div className="lp-bento-card lp-bento-featured">
              <div className="lp-card-num">01 / Feature</div>
              <div className="lp-card-icon lp-icon-violet">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 7h16M3 11h10M3 15h6" stroke="#A38BFF" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </div>
              <h3 className="lp-card-title">Smarter<br />Lead Search</h3>
              <p className="lp-card-desc">Find real local businesses filtered by category, location, and digital presence gaps — no aggregators, no noise.</p>
              <div className="lp-card-visual">
                <div className="lp-mini-ui">
                  <div className="lp-mini-header"><span className="lp-dot lp-dot-r" /><span className="lp-dot lp-dot-y" /><span className="lp-dot lp-dot-g" /><span className="lp-mini-title">Lead results</span></div>
                  <div className="lp-mini-rows">
                    {[["The Rustic Cup","Coffee","94"],["Park View Dental","Dental","88"],["Bloom Florist","Retail","82"],["Lakeside Gym","Fitness","79"],["Metro Barbers","Service","71"]].map(([name, cat, score], i) => (
                      <div key={i} className={`lp-mini-row${i === 0 ? " lp-mini-row-active" : ""}`}>
                        <span className="lp-mini-name">{name}</span>
                        <span className="lp-mini-cat">{cat}</span>
                        <span className="lp-mini-score">{score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lp-tags">
                <span className="lp-tag lp-tag-violet">Real businesses</span>
                <span className="lp-tag lp-tag-mint">Filtered</span>
              </div>
            </div>

            <div className="lp-bento-card">
              <div className="lp-card-num">02 / Feature</div>
              <div className="lp-card-icon lp-icon-mint">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 16l5-5 3 3 6-8" stroke="#3DFFB0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h3 className="lp-card-title">AI Opportunity Scoring</h3>
              <p className="lp-card-desc">Each lead is scored for QR-code fit and outreach readiness so you know exactly who to call first.</p>
              <div className="lp-tags" style={{ marginTop: 20 }}>
                <span className="lp-tag lp-tag-mint">AI-powered</span>
                <span className="lp-tag lp-tag-coral">Prioritised</span>
              </div>
            </div>

            <div className="lp-bento-card">
              <div className="lp-card-num">03 / Feature</div>
              <div className="lp-card-icon lp-icon-coral">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="16" height="16" rx="2.5" stroke="#FF8095" strokeWidth="1.5" /><path d="M7 9h8M7 13h5" stroke="#FF8095" strokeWidth="1.3" strokeLinecap="round" /></svg>
              </div>
              <h3 className="lp-card-title">Outreach Drafts</h3>
              <p className="lp-card-desc">Move from company analysis to a tailored email draft in seconds. Keep history so good leads don't go cold.</p>
              <div className="lp-tags" style={{ marginTop: 20 }}>
                <span className="lp-tag lp-tag-coral">Contextual</span>
                <span className="lp-tag lp-tag-violet">History</span>
              </div>
            </div>

            <div className="lp-bento-card" style={{ gridColumn: "2 / 4" }}>
              <div className="lp-card-num">04 / Analytics</div>
              <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div className="lp-card-icon lp-icon-gold">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 16l5-5 3 3 6-8" stroke="#FFB830" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <h3 className="lp-card-title">Conversion Analytics</h3>
                  <p className="lp-card-desc">Track sends, replies, and wins by category so every campaign teaches you where to focus next.</p>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="lp-ai-box lp-ai-prompt">"Restaurants in Austin with no QR menu"</div>
                  <div style={{ textAlign: "center", color: "#FFB830", fontSize: 18 }}>↓</div>
                  <div className="lp-ai-box lp-ai-result">
                    <span style={{ color: "#FFB830", fontSize: 11, fontFamily: "monospace", display: "block", marginBottom: 4 }}>Found in 1.8s</span>
                    34 leads · avg score 81 · 12 high-priority
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SHOWCASE */}
        <section className="lp-section lp-showcase-section" id="showcase">
          <div className="lp-showcase-inner">
            <div className="lp-showcase-text">
              <div className="lp-section-label">Dashboard</div>
              <h2 className="lp-section-title">One workspace.<br />Your whole pipeline.</h2>
              <p className="lp-section-sub">Find leads, review scores, draft outreach, and track results — without switching between tools.</p>
              <ul className="lp-feature-list">
                {["Real-time business search by category and location","AI-scored leads with QR-code opportunity signals","Outreach draft generator with full company context","CSV export for any filtered lead list","Reply and conversion tracking by industry"].map((item, i) => (
                  <li key={i} className="lp-feature-item">{item}</li>
                ))}
              </ul>
            </div>

            <div className="lp-screen">
              <div className="lp-screen-header">
                <div style={{ display: "flex", gap: 6 }}><span className="lp-dot lp-dot-r" /><span className="lp-dot lp-dot-y" /><span className="lp-dot lp-dot-g" /></div>
                <span className="lp-screen-url">app.stirling-market-leads.io/dashboard</span>
                <div style={{ width: 60 }} />
              </div>
              <div className="lp-screen-body">
                <div className="lp-screen-sidebar">
                  <div className="lp-sidebar-label" style={{ fontSize: 9 }}>Navigation</div>
                  {[["Dashboard","active"],["Leads",""],["Scoring",""],["Outreach",""],["Analytics",""]].map(([label, cls], i) => (
                    <div key={i} className={`lp-screen-nav-item${cls ? " lp-active" : ""}`}>{label}</div>
                  ))}
                </div>
                <div className="lp-screen-content">
                  <div className="lp-screen-title">Overview</div>
                  <div className="lp-screen-cards">
                    {[["Leads","1,284"],["Scored","94%"],["Outreach","48"]].map(([l, v], i) => (
                      <div key={i} className="lp-screen-card">
                        <div className="lp-screen-card-label">{l}</div>
                        <div className={`lp-screen-card-val${i === 1 ? " lp-mint" : ""}`}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="lp-activity">
                    {[
                      ["The Rustic Cup","contacted","2m ago","Done","mint"],
                      ["Park View Dental","scoring","5m ago","Active","gold"],
                      ["Bloom Florist","outreach sent","12m ago","Done","mint"],
                      ["Lakeside Gym","needs review","18m ago","Review","coral"],
                    ].map(([name, action, time, status, color], i) => (
                      <div key={i} className="lp-activity-item">
                        <span className="lp-activity-dot" style={{ background: color === "mint" ? "#3DFFB0" : color === "gold" ? "#FFB830" : "#FF4D6D" }} />
                        <span className="lp-activity-name">{name} — {action}</span>
                        <span className="lp-activity-time">{time}</span>
                        <span className={`lp-activity-status lp-status-${color}`}>{status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" style={{ padding: "0 28px 80px" }}>
          <div
            style={{
              maxWidth: 1180,
              margin: "0 auto",
              borderRadius: 36,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "linear-gradient(180deg, rgba(10,12,18,0.96), rgba(20,24,36,0.94))",
              padding: 32,
              color: "#fff",
              boxShadow: "0 24px 80px rgba(4,6,12,0.28)",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ maxWidth: 560 }}>
                <div style={{ fontSize: 12, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>Pricing</div>
                <h2 style={{ marginTop: 12, fontSize: "clamp(2rem,4vw,3.25rem)", lineHeight: 1, letterSpacing: "-0.05em" }}>
                  Self-serve for reps. Team plan for shared execution.
                </h2>
                <p style={{ marginTop: 16, fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.72)" }}>
                  Start with a {pricing.trialDays}-day free trial, choose Solo or Team, and move to Enterprise only when procurement or custom onboarding is needed.
                </p>
              </div>
              {!isLoggedIn ? (
                <a
                  href="/register"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    borderRadius: 999,
                    background: "#fff",
                    color: "#111827",
                    padding: "14px 20px",
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  Start trial
                  <ArrowRight size={16} />
                </a>
              ) : null}
            </div>

            <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: 28 }}>
              {[
                {
                  title: "Solo",
                  price: `${pricing.solo.monthlyPriceLabel}/mo`,
                  detail: `Annual option ${pricing.solo.annualPriceLabel}/yr. Equivalent to ${pricing.solo.annualMonthlyEquivalentLabel}/mo.`,
                },
                {
                  title: "Team",
                  price: `${pricing.team.monthlyPriceLabel}/mo`,
                  detail: `Up to 3 seats. Annual option ${pricing.team.annualPriceLabel}/yr and shared workspace controls.`,
                },
                {
                  title: "Enterprise",
                  price: pricing.enterprise.pricingLabel,
                  detail: "Custom annual contract, invoice billing, onboarding support, and procurement docs.",
                },
              ].map((plan) => (
                <div
                  key={plan.title}
                  style={{
                    borderRadius: 28,
                    padding: 24,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{plan.title}</div>
                  <div style={{ marginTop: 12, fontSize: 38, fontWeight: 700, letterSpacing: "-0.05em" }}>{plan.price}</div>
                  <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.7)" }}>{plan.detail}</p>
                  <div style={{ marginTop: 18, fontSize: 13, color: "#8ef0c5" }}>
                    {plan.title === "Enterprise" ? "Talk to sales" : `${pricing.trialDays}-day free trial`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        </main>

        {/* FOOTER */}
        <footer className="lp-footer">
          <div className="lp-footer-grid">
            <div>
              <a href="/" className="lp-logo">
                <div className="lp-logo-icon">
                  <svg viewBox="0 0 18 18" fill="none" width="18" height="18">
                    <path d="M3 3h5v5H3V3zm7 0h5v5h-5V3zm0 7h5v5h-5v-5zm-7 0h5v5H3v-5z" fill="white" opacity="0.9" />
                  </svg>
                </div>
                <span className="lp-logo-text">Stirling Market Leads</span>
              </a>
              <p className="lp-footer-desc">AI-powered lead prospecting for local business sales teams. Find, score, and convert with confidence.</p>
            </div>
            <div>
              <div className="lp-footer-col-title">Product</div>
              <ul className="lp-footer-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#showcase">How it works</a></li>
                <li><a href="#pricing">Pricing</a></li>
              </ul>
            </div>
            <div>
              <div className="lp-footer-col-title">Account</div>
              <ul className="lp-footer-links">
                <li><button className="lp-footer-btn" onClick={() => setModalOpen(true)}>Sign In</button></li>
                <li><a href="/register">Get Started</a></li>
                <li><a href="/reset-password">Reset password</a></li>
                <li><a href="/dashboard">Dashboard</a></li>
              </ul>
            </div>
            <div>
              <div className="lp-footer-col-title">Company</div>
              <ul className="lp-footer-links">
                <li><a href="#">About</a></li>
                <li><a href="/contact">Contact</a></li>
                <li><a href="/privacy-policy">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span className="lp-footer-copy">© Stirling Market Leads 2024 All rights reserved</span>
            <div className="lp-footer-legal">
              <a href="/privacy-policy">Privacy Policy</a>
              <a href="/privacy-policy#terms">Terms of Service</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

const landingCSS = `
  .lp-root {
    background: #05050A;
    color: #F0EEFF;
    font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
    min-height: 100vh;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }

  /* Modal */
  .lp-modal-backdrop {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(12px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: lp-fade-in 0.2s ease;
  }
  .lp-modal {
    background: #0D0D1A;
    border: 1px solid rgba(120,110,200,0.25);
    border-radius: 20px;
    width: 100%; max-width: 420px;
    padding: 32px;
    position: relative;
    box-shadow: 0 40px 80px rgba(0,0,0,0.6);
    animation: lp-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes lp-fade-in { from { opacity: 0 } to { opacity: 1 } }
  @keyframes lp-slide-up { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
  .lp-modal-close {
    position: absolute; top: 16px; right: 16px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(120,110,200,0.2);
    color: #9B96CC; border-radius: 8px; width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.15s;
  }
  .lp-modal-close:hover { background: rgba(255,255,255,0.1); color: #F0EEFF; }
  .lp-modal-header { margin-bottom: 28px; }
  .lp-modal-logo {
    width: 40px; height: 40px; border-radius: 10px;
    background: linear-gradient(135deg, #7B5FFF, #3DFFB0);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 16px;
  }
  .lp-modal-title {
    font-size: 22px; font-weight: 700; letter-spacing: -0.03em;
    color: #F0EEFF; margin-bottom: 8px; line-height: 1.2;
  }
  .lp-modal-sub { font-size: 14px; color: #9B96CC; line-height: 1.6; font-weight: 300; }
  .lp-modal-body { display: flex; flex-direction: column; gap: 16px; }
  .lp-field { display: flex; flex-direction: column; gap: 6px; }
  .lp-field label { font-size: 13px; font-weight: 500; color: #B8B4D8; }
  .lp-input {
    background: rgba(255,255,255,0.04); border: 1px solid rgba(120,110,200,0.2);
    border-radius: 10px; padding: 11px 14px; font-size: 14px; color: #F0EEFF;
    outline: none; transition: border-color 0.2s; width: 100%;
    font-family: inherit;
  }
  .lp-input::placeholder { color: #5C587A; }
  .lp-input:focus { border-color: rgba(120,110,200,0.5); }
  .lp-btn-submit {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    background: #3DFFB0; color: #05050A; border: none; border-radius: 10px;
    padding: 13px 20px; font-size: 15px; font-weight: 600; cursor: pointer;
    transition: all 0.2s; font-family: inherit; margin-top: 4px;
  }
  .lp-btn-submit:hover { background: #5AFFC3; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(61,255,176,0.25); }
  .lp-error { background: rgba(255,77,109,0.1); border: 1px solid rgba(255,77,109,0.3); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #FF8095; }
  .lp-info-box { background: rgba(61,255,176,0.08); border: 1px solid rgba(61,255,176,0.25); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #3DFFB0; }

  /* Noise */
  .lp-root::before {
    content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 9998;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    opacity: 0.5;
  }

  /* Nav */
  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    padding: 18px 80px; display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid rgba(120,110,200,0.10);
    background: rgba(5,5,10,0.7); backdrop-filter: blur(20px);
  }
  .lp-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .lp-logo-icon {
    width: 32px; height: 32px; border-radius: 8px;
    background: linear-gradient(135deg, #7B5FFF, #3DFFB0);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .lp-logo-text { font-size: 15px; font-weight: 700; color: #F0EEFF; letter-spacing: -0.02em; }
  .lp-nav-links { display: flex; gap: 2px; list-style: none; margin: 0; padding: 0; }
  .lp-nav-links a { font-size: 13px; font-weight: 500; color: #5C587A; text-decoration: none; padding: 6px 14px; border-radius: 8px; transition: color 0.15s, background 0.15s; }
  .lp-nav-links a:hover { color: #F0EEFF; background: rgba(255,255,255,0.04); }
  .lp-nav-actions { display: flex; gap: 10px; }
  .lp-btn-ghost { font-size: 13px; font-weight: 500; color: #B8B4D8; background: none; border: none; cursor: pointer; padding: 8px 16px; border-radius: 8px; transition: color 0.15s, background 0.15s; font-family: inherit; }
  .lp-btn-ghost:hover { color: #F0EEFF; background: rgba(255,255,255,0.06); }
  .lp-btn-primary { font-size: 13px; font-weight: 600; color: #05050A; background: #3DFFB0; border: none; cursor: pointer; padding: 9px 20px; border-radius: 8px; transition: all 0.2s; font-family: inherit; }
  .lp-btn-primary:hover { background: #5AFFC3; transform: translateY(-1px); }
  .lp-btn-dashboard { display: inline-flex; align-items: center; justify-content: center; text-decoration: none; background: #3DFFB0; color: #05050A; }
  .lp-btn-dashboard:hover { background: #5AFFC3; transform: translateY(-1px); }

  /* Hero */
  .lp-hero {
    position: relative; min-height: auto; display: grid;
    grid-template-columns: 1fr 1fr;
    padding-top: 30px; padding-bottom: 30px; overflow: hidden;
  }
  .lp-orb { position: absolute; border-radius: 50%; filter: blur(120px); pointer-events: none; }
  .lp-orb-1 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(123,95,255,0.18) 0%, transparent 70%); top: -100px; right: -100px; }
  .lp-orb-2 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(61,255,176,0.10) 0%, transparent 70%); bottom: 0; left: -100px; }
  .lp-orb-3 { width: 300px; height: 300px; background: radial-gradient(circle, rgba(255,77,109,0.10) 0%, transparent 70%); top: 40%; left: 40%; }
  .lp-hero-left { display: flex; flex-direction: column; justify-content: center; padding: 80px 60px 80px 80px; position: relative; z-index: 2; }
  .lp-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(61,255,176,0.08); border: 1px solid rgba(61,255,176,0.20); border-radius: 100px; padding: 6px 14px 6px 8px; font-size: 12px; font-weight: 500; color: #3DFFB0; width: fit-content; margin-bottom: 32px; letter-spacing: 0.03em; text-transform: uppercase; }
  .lp-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #3DFFB0; animation: lp-pulse 2s ease-in-out infinite; flex-shrink: 0; }
  @keyframes lp-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
  .lp-hero-headline { font-size: clamp(38px,4.5vw,62px); font-weight: 800; line-height: 1.08; letter-spacing: -0.04em; color: #F0EEFF; margin-bottom: 24px; }
  .lp-hero-headline em { font-style: normal; background: linear-gradient(135deg, #7B5FFF, #3DFFB0); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .lp-hero-sub { font-size: 17px; line-height: 1.7; color: #B8B4D8; max-width: 420px; margin-bottom: 48px; font-weight: 300; }
  .lp-hero-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .lp-btn-hero-primary { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: #05050A; background: #3DFFB0; border: none; cursor: pointer; padding: 14px 28px; border-radius: 10px; transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1); text-decoration: none; font-family: inherit; }
  .lp-btn-hero-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(61,255,176,0.30); background: #5AFFC3; }
  .lp-btn-hero-dashboard { justify-content: center; }
  .lp-btn-hero-secondary { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 500; color: #B8B4D8; background: rgba(255,255,255,0.04); border: 1px solid rgba(120,110,200,0.20); cursor: pointer; padding: 14px 24px; border-radius: 10px; transition: all 0.2s; text-decoration: none; font-family: inherit; }
  .lp-btn-hero-secondary:hover { color: #F0EEFF; border-color: rgba(120,110,200,0.40); }
  .lp-social-proof { margin-top: 52px; display: flex; align-items: center; gap: 16px; }
  .lp-avatars { display: flex; }
  .lp-avatar { width: 34px; height: 34px; border-radius: 50%; border: 2px solid #05050A; margin-left: -10px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
  .lp-avatar:first-child { margin-left: 0; }
  .lp-social-text { font-size: 13px; line-height: 1.5; color: #5C587A; }
  .lp-social-text strong { color: #B8B4D8; font-weight: 600; }

  /* Hero visual */
  .lp-hero-right { position: relative; display: flex; align-items: center; justify-content: center; z-index: 2; padding: 80px 80px 80px 40px; }
  .lp-hero-visual { position: relative; width: 100%; max-width: 520px; }
  .lp-float-badge { position: absolute; background: #181828; border: 1px solid rgba(120,110,200,0.20); border-radius: 12px; padding: 10px 14px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 10px; z-index: 5; }
  .lp-float-top { top: -20px; right: -30px; animation: lp-float1 5s ease-in-out infinite; }
  .lp-float-bottom { bottom: 30px; left: -40px; animation: lp-float2 6s ease-in-out infinite; }
  @keyframes lp-float1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  @keyframes lp-float2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
  .lp-float-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .lp-float-text .lp-float-label { font-size: 11px; color: #5C587A; display: block; margin-bottom: 2px; }
  .lp-float-text .lp-float-val { font-size: 13px; font-weight: 600; color: #F0EEFF; display: block; }
  .lp-ui-card { background: #0D0D1A; border: 1px solid rgba(120,110,200,0.10); border-radius: 16px; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.6); }
  .lp-ui-header { padding: 14px 16px; border-bottom: 1px solid rgba(120,110,200,0.10); display: flex; align-items: center; gap: 8px; background: #121220; }
  .lp-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .lp-dot-r { background: #FF5F57; } .lp-dot-y { background: #FFBD2E; } .lp-dot-g { background: #28CA41; }
  .lp-ui-title { font-size: 11px; color: #5C587A; margin-left: 4px; font-family: monospace; }
  .lp-app-layout { display: flex; height: 300px; }
  .lp-sidebar { width: 180px; background: #121220; padding: 16px; border-right: 1px solid rgba(120,110,200,0.10); flex-shrink: 0; }
  .lp-sidebar-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #9896C4; padding: 8px 0 6px; font-family: monospace; }
  .lp-sidebar-item { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 8px; font-size: 12px; color: #5C587A; margin-bottom: 2px; }
  .lp-sidebar-item.lp-active { background: rgba(123,95,255,0.15); color: #F0EEFF; }
  .lp-sidebar-dot { width: 6px; height: 6px; border-radius: 50%; background: #5C587A; flex-shrink: 0; }
  .lp-main { flex: 1; padding: 16px; }
  .lp-main-title { font-size: 11px; font-weight: 600; color: #B8B4D8; letter-spacing: -0.01em; margin-bottom: 12px; }
  .lp-metric-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
  .lp-metric { background: #0D0D1A; border: 1px solid rgba(120,110,200,0.10); border-radius: 8px; padding: 10px; }
  .lp-metric-label { font-size: 10px; color: #5C587A; margin-bottom: 3px; }
  .lp-metric-value { font-size: 18px; font-weight: 700; color: #F0EEFF; letter-spacing: -0.03em; }
  .lp-metric-value.lp-mint { color: #3DFFB0; } .lp-metric-value.lp-coral { color: #FF4D6D; }
  .lp-progress { height: 3px; border-radius: 2px; background: #05050A; margin-top: 5px; overflow: hidden; }
  .lp-progress-fill { height: 100%; border-radius: 2px; background: #3DFFB0; }
  .lp-bars { display: flex; align-items: flex-end; gap: 4px; height: 60px; margin-bottom: 10px; }
  .lp-bar { flex: 1; background: linear-gradient(to top, #7B5FFF, rgba(123,95,255,0.3)); border-radius: 2px 2px 0 0; }

  /* Stats strip */

  /* Marquee */

  /* Section base */
  .lp-section { padding: 90px 80px 40px; }
  #features.lp-section { padding-top: 30px; }
  .lp-section-header { max-width: 600px; margin-bottom: 56px; }
  .lp-section-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #3DFFB0; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; font-family: monospace; }
  .lp-section-label::before { content: ''; display: block; width: 20px; height: 1px; background: #3DFFB0; }
  .lp-section-title { font-size: clamp(26px,3.2vw,44px); font-weight: 700; line-height: 1.1; letter-spacing: -0.04em; color: #F0EEFF; margin-bottom: 16px; }
  .lp-section-title em { font-style: normal; color: #3DFFB0; }
  .lp-section-sub { font-size: 16px; line-height: 1.7; color: #B8B4D8; max-width: 480px; font-weight: 300; }

  /* Bento */
  .lp-bento { display: grid; grid-template-columns: 1.4fr 1fr 1fr; grid-template-rows: auto auto; gap: 16px; }
  .lp-bento-card { background: #0D0D1A; border: 1px solid rgba(120,110,200,0.10); border-radius: 20px; padding: 32px; position: relative; overflow: hidden; transition: border-color 0.3s, transform 0.3s; }
  .lp-bento-card:hover { border-color: rgba(120,110,200,0.40); transform: translateY(-2px); }
  .lp-bento-card::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 30% 0%, rgba(123,95,255,0.06) 0%, transparent 60%); pointer-events: none; }
  .lp-bento-featured { grid-row: 1/3; display: flex; flex-direction: column; }
  .lp-bento-featured::before { background: radial-gradient(circle at 60% 0%, rgba(61,255,176,0.08) 0%, transparent 60%); }
  .lp-card-num { font-size: 11px; font-weight: 600; color: #2A2840; letter-spacing: 0.08em; margin-bottom: 20px; font-family: monospace; }
  .lp-card-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; flex-shrink: 0; }
  .lp-icon-violet { background: rgba(123,95,255,0.15); } .lp-icon-mint { background: rgba(61,255,176,0.12); } .lp-icon-coral { background: rgba(255,77,109,0.12); } .lp-icon-gold { background: rgba(255,184,48,0.12); }
  .lp-card-title { font-size: 18px; font-weight: 700; letter-spacing: -0.03em; color: #F0EEFF; margin-bottom: 10px; line-height: 1.2; }
  .lp-card-desc { font-size: 14px; line-height: 1.65; color: #5C587A; font-weight: 300; }
  .lp-card-visual { flex: 1; display: flex; align-items: flex-end; margin-top: 24px; }
  .lp-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
  .lp-tag { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 100px; font-size: 11px; font-weight: 500; border: 1px solid; letter-spacing: 0.02em; }
  .lp-tag-violet { background: rgba(123,95,255,0.10); border-color: rgba(123,95,255,0.30); color: #A38BFF; }
  .lp-tag-mint { background: rgba(61,255,176,0.08); border-color: rgba(61,255,176,0.25); color: #3DFFB0; }
  .lp-tag-coral { background: rgba(255,77,109,0.08); border-color: rgba(255,77,109,0.25); color: #FF8095; }

  /* Mini UI in bento */
  .lp-mini-ui { background: #121220; border: 1px solid rgba(120,110,200,0.10); border-radius: 10px; overflow: hidden; flex: 1; width: 100%; }
  .lp-mini-header { padding: 8px 12px; background: #181828; border-bottom: 1px solid rgba(120,110,200,0.10); display: flex; align-items: center; gap: 5px; }
  .lp-mini-title { font-size: 10px; color: #5C587A; margin-left: 4px; font-family: monospace; }
  .lp-mini-rows { padding: 6px; }
  .lp-mini-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; font-size: 11px; color: #5C587A; margin-bottom: 2px; }
  .lp-mini-row.lp-mini-row-active { background: rgba(123,95,255,0.15); color: #F0EEFF; }
  .lp-mini-name { flex: 1; }
  .lp-mini-cat { font-size: 10px; color: #5C587A; background: rgba(120,110,200,0.1); padding: 2px 6px; border-radius: 4px; }
  .lp-mini-score { font-weight: 700; color: #3DFFB0; font-family: monospace; font-size: 12px; }
  .lp-ai-box { background: #121220; border: 1px solid rgba(120,110,200,0.15); border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #B8B4D8; font-style: italic; }
  .lp-ai-result { font-style: normal; background: rgba(255,184,48,0.08); border-color: rgba(255,184,48,0.25); }

  /* Showcase */
  .lp-showcase-section { border-top: 1px solid rgba(120,110,200,0.10); }
  .lp-showcase-inner { display: grid; grid-template-columns: 1fr 1.8fr; gap: 80px; align-items: center; }
  .lp-showcase-text .lp-section-title { margin-bottom: 16px; }
  .lp-showcase-text .lp-section-sub { margin-bottom: 28px; }
  .lp-feature-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .lp-feature-item { display: flex; align-items: center; gap: 12px; font-size: 14px; color: #B8B4D8; }
  .lp-feature-item::before { content: ''; width: 18px; height: 18px; border-radius: 50%; background: rgba(61,255,176,0.12) url("data:image/svg+xml,%3Csvg width='10' height='8' viewBox='0 0 10 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 4L3.5 6.5L9 1' stroke='%233DFFB0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center no-repeat; border: 1px solid rgba(61,255,176,0.30); flex-shrink: 0; }
  .lp-screen { border-radius: 16px; overflow: hidden; border: 1px solid rgba(120,110,200,0.10); box-shadow: 0 40px 80px rgba(0,0,0,0.5); background: #0D0D1A; }
  .lp-screen-header { background: #121220; border-bottom: 1px solid rgba(120,110,200,0.10); padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; }
  .lp-screen-url { font-size: 10px; color: #5C587A; background: #0D0D1A; padding: 4px 10px; border-radius: 6px; font-family: monospace; }
  .lp-screen-body { display: flex; height: 320px; }
  .lp-screen-sidebar { width: 160px; background: #08080F; border-right: 1px solid rgba(120,110,200,0.10); padding: 14px; flex-shrink: 0; }
  .lp-screen-nav-item { padding: 7px 10px; border-radius: 7px; font-size: 12px; color: #8E8BB8; margin-bottom: 2px; }
  .lp-screen-nav-item.lp-active { background: rgba(123,95,255,0.12); color: #A38BFF; }
  .lp-screen-content { flex: 1; padding: 16px; overflow: hidden; }
  .lp-screen-title { font-size: 11px; font-weight: 600; color: #B8B4D8; margin-bottom: 10px; }
  .lp-screen-cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 7px; margin-bottom: 12px; }
  .lp-screen-card { background: #08080F; border: 1px solid rgba(120,110,200,0.10); border-radius: 8px; padding: 12px; }
  .lp-screen-card-label { font-size: 10px; color: #5C587A; margin-bottom: 5px; }
  .lp-screen-card-val { font-size: 18px; font-weight: 700; color: #F0EEFF; letter-spacing: -0.03em; }
  .lp-screen-card-val.lp-mint { color: #3DFFB0; }
  .lp-activity { border: 1px solid rgba(120,110,200,0.10); border-radius: 8px; overflow: hidden; }
  .lp-activity-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-bottom: 1px solid rgba(120,110,200,0.10); font-size: 11px; }
  .lp-activity-item:last-child { border-bottom: none; }
  .lp-activity-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .lp-activity-name { flex: 1; color: #B8B4D8; }
  .lp-activity-time { color: #2A2840; font-family: monospace; font-size: 10px; }
  .lp-activity-status { font-size: 10px; padding: 2px 8px; border-radius: 100px; }
  .lp-status-mint { background: rgba(61,255,176,0.12); color: #3DFFB0; }
  .lp-status-gold { background: rgba(255,184,48,0.12); color: #FFB830; }
  .lp-status-coral { background: rgba(255,77,109,0.12); color: #FF8095; }

  /* Footer */
  .lp-footer { background: #05050a; padding: 60px 80px 36px; border-top: 1px solid rgba(120,110,200,0.10); }
  .lp-footer-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 60px; margin-bottom: 52px; }
  .lp-footer-desc { font-size: 14px; line-height: 1.7; color: #9896C4; margin-top: 14px; max-width: 260px; font-weight: 300; }
  .lp-footer-col-title { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #B8B4D8; background: #05050a; margin-bottom: 18px; }
  .lp-footer-links { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .lp-footer-links a { font-size: 14px; color: #9896C4; background: #05050a; text-decoration: none; transition: color 0.15s; font-weight: 300; }
  .lp-footer-links a:hover { color: #F0EEFF; }
  .lp-footer-btn { background: none; border: none; font-size: 14px; color: #9896C4; cursor: pointer; padding: 0; text-align: left; font-family: inherit; font-weight: 300; transition: color 0.15s; }
  .lp-footer-btn:hover { color: #F0EEFF; }
  .lp-footer-bottom { display: flex; align-items: center; justify-content: space-between; padding-top: 24px; border-top: 1px solid rgba(120,110,200,0.10); }
  .lp-footer-copy { font-size: 13px; color: #9896C4; }
  .lp-footer-legal { display: flex; gap: 20px; }
  .lp-footer-legal a { font-size: 13px; color: #9896C4; text-decoration: none; transition: color 0.15s; }
  .lp-footer-legal a:hover { color: #F0EEFF; }

  /* Animations */
  @keyframes lp-anim-up { from{transform:translateY(20px)} to{transform:translateY(0)} }
  .lp-anim { animation: lp-anim-up 0.6s cubic-bezier(0.16,1,0.3,1) both; }
  .lp-anim-d0 { animation-delay: 0s; }
  .lp-anim-d1 { animation-delay: 0.15s; }
  .lp-anim-d2 { animation-delay: 0.3s; }
  .lp-anim-d3 { animation-delay: 0.45s; }
  .lp-anim-d4 { animation-delay: 0.6s; }
`;
