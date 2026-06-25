import { useEffect, useState } from "react";

function UserModal({
  open,
  loading,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    role: "user",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({
        username: "",
        password: "",
        confirmPassword: "",
        role: "user",
      });

      setError("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const username = form.username.trim();

    if (!username) {
      setError("Username is required.");
      return;
    }

    if (!form.password) {
      setError("Password is required.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    onSubmit({
      username,
      password: form.password,
      role: form.role,
    });
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form
        className="modal-card user-modal"
        onSubmit={handleSubmit}
      >
        <div className="modal-heading">
          <div>
            <h2>Create user</h2>
            <p>Create an account and assign its permissions.</p>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="form-grid">
          <label>
            Username
            <input
              name="username"
              value={form.username}
              onChange={updateField}
              autoComplete="off"
              required
            />
          </label>

          <label>
            Role
            <select
              name="role"
              value={form.role}
              onChange={updateField}
            >
              <option value="user">User</option>
              <option value="restocker">Restocker</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={updateField}
              autoComplete="new-password"
              required
            />
          </label>

          <label>
            Confirm password
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={updateField}
              autoComplete="new-password"
              required
            />
          </label>
        </div>

        {error && (
          <p className="error-message">{error}</p>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            className="primary-button"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create user"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserModal;