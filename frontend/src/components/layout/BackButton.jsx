import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === "/") {
    return null;
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  return (
    <button
      type="button"
      className="global-back-button"
      onClick={handleBack}
      aria-label="Go back to the previous page"
      title="Go back"
    >
      <ArrowLeft size={17} strokeWidth={2.2} />
      <span>Back</span>
    </button>
  );
}

export default BackButton;
