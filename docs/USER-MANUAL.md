# Manual de usuario de Osmoguard

> Osmoguard es un **simulador educativo**. Sus resultados son estimaciones matemáticas con supuestos explícitos; no son prescripciones ni sustituyen el juicio clínico ni los controles analíticos.

## 1. Acceso

- **Web**: abra la URL del servicio en cualquier navegador moderno. En el móvil puede *Instalar* o *Añadir a pantalla de inicio* para usarla como app (PWA).
- **Android**: instale el APK. Si el servidor cambia, en la pantalla de inicio de sesión toque **Servidor** e introduzca la nueva URL `https://…`.

### Cuenta

1. **Crear cuenta**: nombre, correo, contraseña (mínimo 10 caracteres con letras y números) y aceptación del uso educativo.
2. **Iniciar sesión**: tras 5 intentos fallidos la cuenta se bloquea 15 minutos.
3. **¿Olvidó su contraseña?**: recibirá un enlace de un solo uso válido 30 minutos. Al cambiarla se cierran todas las sesiones.

## 2. Panel (Inicio)

Muestra el total de simulaciones, las de los últimos 30 días, las que tienen advertencias, la versión del motor, las simulaciones recientes y su distribución por tipo de disnatremia.

## 3. Nueva simulación

El asistente tiene cinco pasos. Cada paso valida sus campos antes de avanzar.

1. **Paciente**: edad, sexo biológico, peso, talla (opcional) y cronología. También puede cargar uno de los **casos de ejemplo ficticios**.
2. **Laboratorio**: sodio, potasio, glucosa y creatinina. Glucosa y creatinina admiten mg/dL o mmol/L / µmol/L, con la conversión visible.
3. **Balance**: diuresis (o *Desconocida*), sodio y potasio urinarios, ingesta oral, otras pérdidas y factores de riesgo de desmielinización osmótica.
4. **Escenarios**: hasta 4 combinaciones de solución, **velocidad hipotética** y horizonte (máximo 48 h).
5. **Revisar**: resumen editable y botón **Ejecutar simulación** (requiere conexión).

> No introduzca nombres, documentos ni números de historia clínica.

## 4. Interpretar los resultados

- **Tarjetas superiores**: sodio inicial y clasificación, agua corporal total con su rango, sodio corregido o déficit de agua libre, y función renal.
- **Aplicabilidad del modelo**: límites que condicionan la lectura. Si aparece **Bloqueado**, no se muestran números.
- **Escenarios**: para cada uno, el cambio por litro (Adrogué-Madias), el cambio estimado a 24 h y al final, el gráfico y las alertas.
  - Cada **punto** es una estimación en una hora concreta. La **barra vertical** es la banda de sensibilidad. Los puntos no se unen con líneas porque el modelo no respalda una trayectoria continua.
  - La franja verde es el rango 135–145 mmol/L. La línea roja discontinua es su límite de corrección en 24 h.
  - **Ver tabla de datos** muestra los valores exactos.
- **Comparación**: todos los escenarios superpuestos, cada uno con su forma y color, una tabla resumen y el cambio por litro de todas las soluciones del catálogo.
- **Fórmulas y supuestos**: expresiones, unidades, fuentes y supuestos de la versión del motor utilizada.

Niveles de los mensajes: **Información** (azul), **Advertencia** (ámbar), **Alerta** (rojo) y **Bloqueado** (gris).

## 5. Guardar, historial y detalle

- **Guardar en historial**: indique un título sin datos identificables y, opcionalmente, notas. Las notas se guardan cifradas.
- **Historial**: búsqueda por título y paginación.
- **Detalle**:
  - **Editar como nueva** carga los datos en el asistente.
  - **Duplicar** crea una copia recalculada con la versión actual del motor.
  - **Eliminar** la borra definitivamente.
  - Si la simulación se calculó con una versión anterior del motor, verá un aviso.

## 6. Perfil y configuración

- Nombre y profesión.
- **Umbrales de alerta**, acotados a los rangos de las guías. Se aplican a las nuevas simulaciones.
- Cambio de contraseña, sesiones activas y **Cerrar todas las sesiones**.
- **Eliminar mi cuenta**: borra la cuenta y todas sus simulaciones.

## 7. Sin conexión

La app abre sin conexión y muestra **Sin conexión**. Puede rellenar el formulario, pero el motor se ejecuta en el servidor y los datos no se guardan en el dispositivo. Cuando hay una versión nueva, aparece **Actualizar**.

## 8. Ciencia y limitaciones

La sección **Ciencia** explica qué hace y qué no hace el simulador, con las fórmulas, el catálogo de soluciones y las referencias bibliográficas.
