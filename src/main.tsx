import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";

// 抑制浏览器扩展产生的通信错误（不影响应用功能）
window.addEventListener('unhandledrejection', (event) => {
  const msg = event?.reason?.message || '';
  if (
    msg.includes('Could not establish connection') ||
    msg.includes('Receiving end does not exist') ||
    msg.includes('message channel closed before a response')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper>
      <App />
    </AppWrapper>
  </StrictMode>
);
