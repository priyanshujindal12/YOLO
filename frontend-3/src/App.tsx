import { BrowserRouter, Route, Routes, } from "react-router-dom";
import "./index.css";

import { Login } from "./Pages/Login";
import { Home } from "./Pages/Home";
import { Landing } from "./Pages/Landing";
import { Chat } from "./Pages/Chat";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/chat/:roomId" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App