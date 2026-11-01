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

/** Fire-and-forget wake-up ping with timeout + one retry. */
const wakeBackend = async (attempt = 1) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000); // 30 s timeout
  try {
    await fetch(`${RENDER_URL}/invoice/suppliers/`, {
      method: "GET",
      signal: controller.signal,
    });
  } catch {
    // Retry once — the first request often fails while Render is booting
    if (attempt < 2) {
      setTimeout(() => wakeBackend(attempt + 1), 3_000);
    }
  } finally {
    clearTimeout(timer);
  }
};

const App = () => {
  useEffect(() => {
    // Wake Render's free dyno immediately so the backend is warm by login time
    wakeBackend();
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
