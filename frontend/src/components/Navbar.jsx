import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatINRShort } from "../utils/format.js";
import { useAuth } from "../context/AuthContext.jsx";
import NotificationsPanel, { useUnreadCount } from "./NotificationsPanel.jsx";

export default function Navbar({ monthlySpend, notifBump = 0 }) {
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const { count, refresh } = useUnreadCount();

  useEffect(() => {
    if (notifBump > 0) refresh();
  }, [notifBump, refresh]);

  const initials = (user?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const openNotif = () => {
    setNotifOpen(true);
    refresh();
  };

  return (
    <nav className="navbar glass">
      <Link to="/" className="navbar-brand">
        <div className="logo-mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <div className="brand-name">FinSight AI</div>
          <div className="brand-tag">Smart expense intelligence</div>
        </div>
      </Link>

      <div className="navbar-center">
        <div className="nav-stat">
          <span className="nav-stat-label">This month</span>
          <span className="nav-stat-value">{formatINRShort(monthlySpend)}</span>
        </div>
      </div>

      <div className="navbar-actions">
        <div className="notif-wrap">
          <button
            type="button"
            className="icon-btn"
            title="Notifications"
            aria-label="Notifications"
            onClick={openNotif}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {count > 0 && <span className="notif-badge">{count > 9 ? "9+" : count}</span>}
          </button>
          <NotificationsPanel
            open={notifOpen}
            onClose={() => {
              setNotifOpen(false);
              refresh();
            }}
          />
        </div>
        <Link to="/profile" className="profile-chip" title="Profile">
          <span className="profile-avatar">{initials}</span>
          <span className="profile-name">{user?.name?.split(" ")[0] || "Profile"}</span>
        </Link>
      </div>
    </nav>
  );
}
