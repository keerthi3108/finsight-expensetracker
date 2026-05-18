import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Navbar from "../components/Navbar.jsx";
import { formatINR, formatDateIN } from "../utils/format.js";

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [stats, setStats] = useState({ count: 0, total: 0 });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    api.get("/expenses").then(({ data }) => {
      const total = data.reduce((s, e) => s + Number(e.amount || 0), 0);
      setStats({ count: data.length, total });
    }).catch(() => {});
  }, []);

  const initials = (user?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const saveProfile = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      const { data } = await api.put("/auth/profile", { name, email });
      updateUser(data.user);
      setMsg("Profile updated successfully");
    } catch (ex) {
      setErr(ex.response?.data?.error || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      await api.put("/auth/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setMsg("Password changed successfully");
    } catch (ex) {
      setErr(ex.response?.data?.error || "Password update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard-app">
      <Navbar monthlySpend={0} />
      <main className="dashboard-main profile-page">
        <div className="profile-header glass">
          <div className="profile-hero-avatar">{initials}</div>
          <div>
            <h1>{user?.name}</h1>
            <p className="muted">{user?.email}</p>
            <p className="muted small">
              Member since {user?.createdAt ? formatDateIN(user.createdAt) : "—"}
            </p>
          </div>
          <Link to="/" className="btn btn-ghost">
            Back to dashboard
          </Link>
        </div>

        <div className="profile-stats">
          <article className="summary-card glass card-accent-cyan">
            <p className="summary-label">Bills tracked</p>
            <p className="summary-value">{stats.count}</p>
          </article>
          <article className="summary-card glass card-accent-emerald">
            <p className="summary-label">Total spent</p>
            <p className="summary-value">{formatINR(stats.total)}</p>
          </article>
        </div>

        {msg && <div className="inline-alert success">{msg}</div>}
        {err && <div className="inline-alert error">{err}</div>}

        <div className="profile-grid">
          <form className="profile-card glass" onSubmit={saveProfile}>
            <h2>Edit profile</h2>
            <div className="field">
              <label>Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Save profile
            </button>
          </form>

          <form className="profile-card glass" onSubmit={savePassword}>
            <h2>Change password</h2>
            <div className="field">
              <label>Current password</label>
              <input
                className="input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>New password</label>
              <input
                className="input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              Update password
            </button>
          </form>
        </div>

        <button type="button" className="btn btn-danger profile-logout" onClick={handleLogout}>
          Log out
        </button>
      </main>
    </div>
  );
}
