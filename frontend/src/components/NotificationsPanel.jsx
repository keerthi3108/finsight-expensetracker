import { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";
import { formatDateIN } from "../utils/format.js";

export default function NotificationsPanel({ open, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/notifications");
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  useEffect(() => {
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, onClose]);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    await api.patch("/notifications/read-all");
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const remove = async (id) => {
    await api.delete(`/notifications/${id}`);
    setItems((prev) => prev.filter((n) => n._id !== id));
  };

  if (!open) return null;

  return (
    <div className="notif-panel glass" ref={panelRef}>
      <div className="notif-head">
        <h3>Notifications</h3>
        <div className="notif-head-actions">
          {items.some((n) => !n.read) && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={markAllRead}>
              Mark all read
            </button>
          )}
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="notif-list">
        {loading && <p className="muted notif-empty">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="muted notif-empty">No notifications yet</p>
        )}
        {items.map((n) => (
          <article
            key={n._id}
            className={`notif-item ${n.read ? "read" : "unread"} notif-${n.type}`}
            onClick={() => !n.read && markRead(n._id)}
          >
            <div className="notif-item-top">
              <strong>{n.title}</strong>
              <button
                type="button"
                className="notif-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(n._id);
                }}
                aria-label="Delete"
              >
                ×
              </button>
            </div>
            <p>{n.message}</p>
            <span className="notif-time">{formatDateIN(n.createdAt)}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

export function useUnreadCount() {
  const [count, setCount] = useState(0);

  const refresh = async () => {
    try {
      const { data } = await api.get("/notifications/unread-count");
      setCount(data.count);
    } catch {
      setCount(0);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, []);

  return { count, refresh };
}
