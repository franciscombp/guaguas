# Aprendizajes: glaseado y distribución de la interfaz

Notas de las referencias que nos compartieron, para que las decisiones de diseño
de la guagua tengan una base escrita.

## 1. El glaseado (referencia: guaguas de panadería)

Las guaguas de la foto no tienen cremas gruesas. Lo que tienen:

- **Líneas finísimas**: el glaseado es un hilo, no un tubo. Su grosor es una fracción
  pequeña del largo de la pieza (en la foto, un hilo de unos milímetros sobre una
  guagua de unos veinte centímetros).
- **Formas simples, repetidas**: zigzags en triángulos, ondas, guirnaldas, contornos
  de la cara (ojos en media luna, sonrisa en curva).
- **Puntitos y grageas**: bolitas blancas, azules y de colores, separadas, sin
  amontonarse.
- **Plano sobre la superficie**: el glaseado se apoya en el pan. No sobresale como
  una varilla.
- **Pocos colores por pieza**: amarillo, naranja, azul, blanco y verde, en pares.
- **La capa de baño va antes que el adorno**: el chocolate cubre toda la pieza, con
  acabado brillante, y encima va el glaseado.

Qué aplicamos:

- La boquilla **Lisa** dibuja una cinta de 0,02 de ancho y 0,006 de grosor, pegada a
  la superficie (`masa.js`, `cinta` en `masa.js`).
- La **Capa** de baño cubre la guagua entera antes de decorar (`BANOS` en `masa.js`).
- Pendiente: un trazo de puntitos y un trazo en zigzag como herramientas propias.

## 2. Distribución de la interfaz (referencias: apps de dibujo)

### Referencia A: app de bocetos en modo pantalla completa (pincel sobre fondo negro)

- **El lienzo manda**: la barra superior tiene pocos iconos (más, deshacer, rehacer,
  compartir, pincel, borrador, color, galería, pantalla completa).
- **Las variantes van en una bandeja debajo del lienzo**: los pinceles aparecen como
  miniaturas en una franja inferior, y el seleccionado se marca con una línea.
- **Lo que pesa se ve**: el tamaño del pincel y la forma del trazo se ven antes de
  dibujar.

Lo aplicamos en Decora: la fila de boquillas y de colores aparece justo encima de la
bandeja de herramientas, no en un menú aparte.

### Referencia B: app de diseño de sillas (capas y herramientas)

- **Los paneles flotan sobre el lienzo**: la lista de capas aparece arriba a la
  derecha, sin empujar la pieza.
- **Herramientas grandes en una bandeja inferior**: lápices, marcadores y borradores
  con su forma real, uno al lado del otro.
- **Un atajo flotante en la bandeja**: una pastilla pequeña cambia entre dos modos
  (lápiz y "+") sin abrir menús.
- **Barra superior mínima**: volver a la izquierda, acciones en el centro, un
  interruptor a la derecha.

Lo aplicamos en la pantalla de Decora: la barra superior solo tiene la etapa, la
cuenta, la vitrina y la ayuda; el panel de herramientas está abajo, y las
configuraciones (color, boquilla, tamaño) van en filas que aparecen con la
herramienta elegida.

### Principios que salen de las dos referencias

1. **El lienzo es lo primero**: los controles se apilan en los bordes y no tapan la
   pieza más de lo necesario.
2. **Herramientas abajo, opciones encima**: la herramienta elegida despliega sus
   opciones en una fila justo encima de la bandeja.
3. **Paneles flotantes, no páginas**: lo secundario (capas, cuenta, vitrina) se abre
   sobre el lienzo y se cierra con un toque.
4. **Iconos grandes y con nombre**: las herramientas se reconocen por forma y por
   rótulo; en pantallas chicas se puede deslizar la fila, pero nunca cortar un icono.
5. **Estado visible**: la herramienta activa tiene relleno de color; el lienzo cambia
   el cursor o la pista según la herramienta.
6. **Pocas acciones arriba**: deshacer, guardar y regalar son lo que se usa a cada
   momento; lo demás vive en el perfil o en la ayuda.

## 3. Pendientes que salen de esto

- Revisar en un iPhone real (Safari 26) que la bandeja inferior no se empalme con la
  barra del navegador.
- Probar la fila de herramientas deslizable con todas las herramientas visibles
  sin cortar iconos.
- Evaluar un atajo flotante tipo "pastilla" para cambiar entre modos de decorar.
