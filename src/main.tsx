import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { installTokens } from "./ui/tokens";
import "./ui/styles.css";

installTokens();
createRoot(document.getElementById("root") as HTMLElement).render(<App />);
