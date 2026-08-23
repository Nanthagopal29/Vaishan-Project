import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";


import Login from "./components/auth/login";
import Home from "./components/home/home";
import Create from "./components/page/create";
import View from "./components/page/view";


const App = () => {
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

export default App
