import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

import Login from "./components/auth/login";
import Home from "./components/home/home";
import Create from "./components/page/create";
import View from "./components/page/view";

const RENDER_URL = "https://vaishanandj-billing.onrender.com";

const App = () => {
  useEffect(() => {
    // Fire-and-forget ping — wakes Render's free dyno immediately on app load
    // so API responses are fast by the time the user navigates to any page
    fetch(`${RENDER_URL}/invoice/bills/`, {
      method: "GET",
      credentials: "include",
    }).catch(() => {}); // silently ignore errors
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/create-bill" element={<Create />} />
        <Route path="/view-bills" element={<View />} />
        <Route path="/View-bills" element={<View />} />
      </Routes>
    </Router>
  );
};

export default App;
