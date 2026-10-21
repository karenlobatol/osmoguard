import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const shots = process.env.E2E_SCREENSHOTS;
const snap = async (page: Page, name: string) => {
  if (shots) await page.screenshot({ path: `${shots}/${test.info().project.name}-${name}.png`, fullPage: true });
};
const a11y = async (page: Page) => {
  // Espera a que terminen las animaciones de entrada (la opacidad parcial falsea el contraste).
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
  await page.waitForTimeout(400);
  const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const serious = res.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
};

test("flujo completo: registro, simulación, guardado, historial y borrado", async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Bienvenido de nuevo" })).toBeVisible();
  await a11y(page);
  await snap(page, "01-login");

  await page.getByRole("link", { name: "Crear cuenta" }).click();
  await page.getByLabel("Nombre").fill("Dra. Demo");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill("Clave-demo-2026");
  await page.getByText("Entiendo que Osmoguard es una herramienta educativa").click();
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page.getByRole("heading", { name: /Hola, Dra\./ })).toBeVisible();
  await a11y(page);
  await snap(page, "02-dashboard-empty");

  await page.goto("/simulaciones/nueva");
  await expect(page.getByText("Casos de práctica")).toBeVisible();
  await page.getByRole("button", { name: /Introducir un caso propio/ }).click();
  // Validación por paso: no avanza sin datos obligatorios.
  await page.getByRole("button", { name: /Siguiente/ }).click();
  await expect(page.getByText("Obligatorio").first()).toBeVisible();
  await a11y(page);
  await snap(page, "03-wizard-validation");

  await page.goto("/simulaciones/nueva");
  await page.getByRole("button", { name: /Hiponatremia tipo SIADH/ }).click();
  await expect(page.getByText("Escenarios (2)")).toBeVisible();
  await snap(page, "04-wizard-review");
  await page.getByRole("button", { name: /Ejecutar simulación/ }).click();

  await expect(page.getByRole("heading", { name: "Resultados de la simulación" })).toBeVisible();
  await expect(page.getByText("Comparación rápida")).toBeVisible();
  await expect(page.getByText("Salino hipertónico").first()).toBeVisible();
  await expect(page.getByText("Dentro del límite de corrección")).toBeVisible();
  await a11y(page);
  await snap(page, "05-results");

  await page.getByText("Ver comparación por litro").click();
  await expect(page.locator("details", { hasText: "Ver comparación por litro" }).locator(".recharts-surface")).toBeVisible();
  await snap(page, "06-compare");

  await page.getByRole("button", { name: /Guardar en historial/ }).click();
  await page.getByRole("button", { name: /^Guardar$/ }).click();
  await expect(page.getByText("Simulación guardada")).toBeVisible();
  await expect(page).toHaveURL(/\/simulaciones\/[0-9a-f-]{36}$/);
  await snap(page, "07-detail");

  await page.goto("/historial");
  await expect(page.getByText(/Hiponatremia Na 118/)).toBeVisible();
  await a11y(page);
  await snap(page, "08-history");

  await page.getByText(/Hiponatremia Na 118/).click();
  await page.getByRole("button", { name: "Eliminar" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).click();
  await expect(page).toHaveURL(/\/historial$/);
  await expect(page.getByText("Aún no hay casos guardados")).toBeVisible();

  await page.goto("/ciencia");
  await expect(page.getByRole("heading", { name: "Cómo calcula Osmoguard" })).toBeVisible();
  await a11y(page);
  await snap(page, "09-science");

  await page.goto("/perfil");
  await expect(page.getByText("Umbrales de alerta")).toBeVisible();
  await a11y(page);
  await snap(page, "10-profile");

  // La sesión persiste tras recargar (refresh token en cookie HttpOnly, access token solo en memoria).
  await page.reload();
  await expect(page.getByText("Umbrales de alerta")).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage))).not.toMatch(/eyJ/);
});

test("rutas protegidas redirigen al login", async ({ page }) => {
  await page.goto("/historial");
  await expect(page).toHaveURL(/\/login$/);
});

test("datos fuera de alcance bloquean resultados", async ({ page }) => {
  const email = `e2e-b-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill("Prueba Bloqueo");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill("Clave-demo-2026");
  await page.getByText("Entiendo que Osmoguard es una herramienta educativa").click();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: /Hola/ })).toBeVisible();
  await page.goto("/simulaciones/nueva");
  await page.getByRole("button", { name: /Introducir un caso propio/ }).click();
  await page.getByLabel("Edad").fill("12");
  await page.getByText("Mujer", { exact: true }).click();
  await page.getByLabel("Peso").fill("40");
  await page.getByRole("button", { name: /Siguiente/ }).click();
  await page.getByLabel("Sodio sérico").fill("120");
  await page.getByRole("button", { name: /Siguiente/ }).click();
  await page.getByLabel("Diuresis", { exact: true }).fill("40");
  await page.getByRole("button", { name: /Siguiente/ }).click();
  await page.getByLabel("Velocidad hipotética").fill("50");
  await page.getByRole("button", { name: /Siguiente/ }).click();
  await page.getByRole("button", { name: /Ejecutar simulación/ }).click();
  await expect(page.getByText("Resultados no disponibles")).toBeVisible();
  await expect(page.getByText("Población pediátrica fuera del alcance")).toBeVisible();
  await expect(page.locator(".recharts-surface")).toHaveCount(0);
  await snap(page, "11-blocked");
});
