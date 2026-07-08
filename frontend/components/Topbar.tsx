type TopbarProps = {
  name: string;
  email: string;
  initials: string;
  onLogout: () => void;
};

export default function Topbar({
  name,
  email,
  initials,
  onLogout,
}: TopbarProps) {
  return (
    <div className="welcome">
      <div>
        <h1>Welcome back, {name.split(" ")[0]}</h1>
        <p>Manage all key aspects of your inventory system here.</p>
      </div>

      <div className="who">
        <div className="avatar">{initials}</div>

        <div>
          <div className="nm">{name}</div>
          <div className="em">{email}</div>
        </div>

        <button
          className="logout"
          title="Log out"
          type="button"
          onClick={onLogout}
        >
          ↪
        </button>
      </div>
    </div>
  );
}