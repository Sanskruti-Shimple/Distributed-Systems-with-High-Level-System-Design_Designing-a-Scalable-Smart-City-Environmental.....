import { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  FluentProvider,
  Tab,
  TabList,
  Text,
  Toolbar,
  Tooltip,
} from "@fluentui/react-components";
import {
  AlertRegular,
  ArrowSyncRegular,
  GridRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
} from "@fluentui/react-icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocation, useNavigate, useRoutes } from "react-router-dom";
import { darkTheme, lightTheme } from "../theme";
import { PreviewStateSwitcher } from "./PreviewStateSwitcher";
import type { ReactNode } from "react";

type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readThemePreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem("app-theme");
    if (value === "light" || value === "dark" || value === "system")
      return value;
  } catch {
    return "system";
  }
  return "system";
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [themePreference, setThemePreference] =
    useState<ThemePreference>(readThemePreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const resolvedTheme =
    themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) =>
      setSystemTheme(event.matches ? "dark" : "light");
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  function toggleTheme() {
    const nextTheme: ThemePreference =
      resolvedTheme === "dark" ? "light" : "dark";
    setThemePreference(nextTheme);
    try {
      window.localStorage.setItem("app-theme", nextTheme);
    } catch {
      setThemePreference(nextTheme);
    }
  }

  const routeContent = useRoutes([
    { path: "/", element: children },
    { path: "*", element: children },
  ]);

  return (
    <FluentProvider
      theme={resolvedTheme === "dark" ? darkTheme : lightTheme}
      className="fluent-root"
    >
      <div className="app-frame" data-theme={resolvedTheme}>
        <header className="app-header">
          <Toolbar
            className="app-toolbar"
            aria-label="Metrovale application header"
          >
            <div className="brand-lockup">
              <div className="brand-mark" aria-hidden="true">
                <GridRegular />
              </div>
              <div className="brand-copy">
                <Text weight="semibold" className="brand-name">
                  Metrovale
                </Text>
                <Text size={200} className="brand-subtitle">
                  Environmental monitoring
                </Text>
              </div>
            </div>
            <div className="header-actions">
              <Text size={200} className="header-freshness">
                <span className="live-dot" /> Live data · 12 sec ago
              </Text>
              <Tooltip
                content={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
                relationship="label"
              >
                <Button
                  appearance="subtle"
                  icon={
                    resolvedTheme === "dark" ? (
                      <WeatherSunnyRegular />
                    ) : (
                      <WeatherMoonRegular />
                    )
                  }
                  aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
                  onClick={toggleTheme}
                />
              </Tooltip>
              <Avatar name="Metrovale operations" color="brand" size={32} />
            </div>
          </Toolbar>
        </header>

        <nav className="primary-nav" aria-label="Main navigation">
          <TabList
            selectedValue={location.pathname}
            onTabSelect={(_, data) => navigate(String(data.value))}
            className="nav-tabs"
          >
            <Tab value="/" icon={<GridRegular />}>
              City overview
            </Tab>
            <Tab value="/sensors" icon={<ArrowSyncRegular />}>
              Sensor explorer
            </Tab>
            <Tab value="/alerts" icon={<AlertRegular />}>
              Alerts &amp; system health
            </Tab>
          </TabList>
        </nav>

        <main className="page-container">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              className="route-motion"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{
                duration: reduceMotion ? 0 : 0.2,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              {routeContent}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="app-footer">
          <Text size={200}>Metrovale · City environmental operations</Text>
          <Text size={200}>Monitoring network status: nominal</Text>
        </footer>
        <PreviewStateSwitcher />
      </div>
    </FluentProvider>
  );
}
