import { createLazyFileRoute } from "@tanstack/react-router";
import {
  Title,
  Stack,
  Card,
} from "@mantine/core";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { SettingsSection } from "@/components/sections/SettingsSection";

import { pageTitle } from "../styles/layout.css";

function SettingsPage() {
  const themeColors = useThemeColors();
  const { colors } = themeColors;

  return (
    <Card
      shadow="xl"
      padding="xl"
      radius="lg"
      withBorder
      style={{
        backgroundColor: colors.background.blur,
        backdropFilter: "blur(10px)",
        maxWidth: "800px",
      }}
    >
      <Stack gap="xl">
        <Title order={1} className={pageTitle} ta="center">
          Settings
        </Title>

        <SettingsSection />
      </Stack>
    </Card>
  );
}

export const Route = createLazyFileRoute("/settings")({
  component: SettingsPage,
});

export default SettingsPage;
