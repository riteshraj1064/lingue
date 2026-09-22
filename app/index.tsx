// app/index.tsx
import { Redirect } from "expo-router";
import React from "react";

export default function Index() {

  // Direct entry goes to the branded Splash Screen
  return <Redirect href="/splash" />;
}
