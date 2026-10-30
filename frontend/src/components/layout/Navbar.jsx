import { useState } from "react";
import {
  Link,
  NavLink,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

function Navbar() {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const {
    user,
    isAuthenticated,
    isLoading,
    logout,
  } = useAuth();

  const navigate = useNavigate();

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate("/");
  };

  const navClass = ({ isActive }) =>
    `nav-link ${isActive ? "active" : ""}`;

  return (
    <header className="site-header">
      <div className="navbar-container">
        <Link
          to="/"
          className="brand"
          onClick={closeMenu}
        >
          <span className="brand-mark">
            C
          </span>

          <span className="brand-text">
            <strong>CityNest</strong>
            <small>
              Settle in. Live better.
            </small>
          </span>
        </Link>

        <button
          type="button"
          className="mobile-menu-button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() =>
            setMenuOpen(
              (current) => !current,
            )
          }
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          className={`main-nav ${
            menuOpen ? "open" : ""
          }`}
        >
          <NavLink
            to="/"
            className={navClass}
            onClick={closeMenu}
          >
            Home
          </NavLink>

          <NavLink
            to="/stay"
            className={navClass}
            onClick={closeMenu}
          >
            Stay
          </NavLink>

          <NavLink
            to="/food"
            className={navClass}
            onClick={closeMenu}
          >
            Food
          </NavLink>

          <NavLink
            to="/marketplace"
            className={navClass}
            onClick={closeMenu}
          >
            Marketplace
          </NavLink>
          <NavLink
            to="/compare?type=property"
            className={navClass}
            onClick={closeMenu}
          >
            Compare
          </NavLink>

          <div className="nav-divider" />

          {isLoading ? (
            <div className="nav-loading">
              <span />
            </div>
          ) : isAuthenticated ? (
            <>
              <NavLink
                to="/dashboard"
                className="nav-dashboard"
                onClick={closeMenu}
              >
                Dashboard
              </NavLink>
              {user?.role === "owner" && (
                <NavLink to="/owner" className="nav-link" onClick={closeMenu}>Owner Studio</NavLink>
              )}
              {user?.role === "admin" && (
                <NavLink to="/admin" className="nav-link" onClick={closeMenu}>Admin</NavLink>
              )}

              <div className="nav-user">
                <span className="nav-avatar">
                  {user?.full_name
                    ?.charAt(0)
                    ?.toUpperCase() || "U"}
                </span>

                <span className="nav-user-name">
                  {user?.full_name
                    ?.split(" ")[0] ||
                    "Account"}
                </span>
              </div>

              <button
                type="button"
                className="nav-logout"
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className="nav-login"
                onClick={closeMenu}
              >
                Log in
              </NavLink>

              <NavLink
                to="/register"
                className="nav-register"
                onClick={closeMenu}
              >
                Get started
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;