import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

import { useHydrated, useSession } from "@/features/auth/store";
import { theme, useColors, useThemedStyles, type Scheme } from "@/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * A aba selecionada ganha uma pill atrás do ícone.
 *
 * Cor sozinha não sobrevive ao sol nem ao daltonismo; a pill dá forma ao estado
 * ativo e continua legível quando o contraste da tela cai.
 */
function TabIcon({
  name,
  activeName,
  color,
  focused,
}: {
  name: IconName;
  activeName: IconName;
  color: string;
  focused: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.icon, focused && styles.iconActive]}>
      <Ionicons name={focused ? activeName : name} color={color} size={22} />
    </View>
  );
}

export default function TabsLayout() {
  const hydrated = useHydrated();
  const session = useSession();
  const colors = useColors();

  /* Guarda de conveniência — a autorização real é do backend (regra 10). */
  if (hydrated && !session) return <Redirect href="/login" />;
  /* Repete o desvio de `app/index.tsx` para deep link não furar a tela de troca:
     com senha provisória, tudo aqui dentro responderia 403. */
  if (hydrated && session?.mustChangePassword) return <Redirect href="/primeiro-acesso" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.outline,
          paddingTop: theme.space.sm,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.onSurfaceMuted,
        tabBarLabelStyle: { fontSize: 11, fontFamily: theme.fonts.semibold },
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" activeName="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: "Viagens",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="navigate-outline"
              activeName="navigate"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="fuel"
        options={{
          title: "Abastecer",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="water-outline" activeName="water" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="person-circle-outline"
              activeName="person-circle"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const makeStyles = (colors: Scheme) =>
  StyleSheet.create({
    icon: {
      minWidth: 56,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "transparent",
    },
    iconActive: { backgroundColor: colors.accentSoft, borderColor: `${colors.accent}3D` },
  });
