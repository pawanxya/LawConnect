import { createContext, useContext, useEffect, useState } from "react";
const initialState = {
  theme: "system",
  setTheme: () => null,
};
const ThemeProviderContext = createContext(initialState);
function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "lawconnect-theme",
  ...props
}) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(storageKey) || defaultTheme,
  );
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      return;
    }
    root.classList.add(theme);
  }, [theme]);
  const value = {
    theme,
    setTheme: (theme2) => {
      localStorage.setItem(storageKey, theme2);
      setTheme(theme2);
    },
  };
  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === void 0)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
export { ThemeProvider, useTheme };
