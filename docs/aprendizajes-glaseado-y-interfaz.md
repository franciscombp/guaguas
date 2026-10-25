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
- **Puntitos de glaseado**: gotas blancas, azules y de colores, separadas, sin
  amontonarse. No son grageas: en las guaguas de panadería todo es glaseado.
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

## 4. Más guaguas de referencia: cromática y estilos

Tres fotos nuevas. Los colores de abajo son aproximaciones a ojo, no muestras medidas.

### Cromática

Dos familias conviven en las fotos:

- **Neón de fiesta** (primera foto): turquesa, fucsia, amarillo limón, verde lima,
  naranja, morado y azul rey. Colores saturados sobre pan dorado; casi nada de blanco.
- **Pastel y natural** (tercera foto): blanco hueso, rosa pálido, verde menta y
  naranja suave, con el pan en tonos cálidos.

Lo que se repite en todas: el **pan dorado** es el fondo, y el glaseado de un solo
color casi no aparece. Se combinan 3 a 5 colores por pieza.

Paleta sugerida para `CREMAS` (hoy tiene merengue, rosa, fucsia, morado, celeste,
verde, amarillo y café):

| Color | Aprox. | Dónde se ve |
|---|---|---|
| Turquesa | `#3fd6d0` | primera foto, rayas y zigzags |
| Naranja | `#ff8a1f` | primera y segunda foto, puntos y contornos |
| Fucsia | `#ff4f9a` | primera y segunda foto, líneas |
| Amarillo limón | `#ffe03a` | primera y segunda foto, zigzags |
| Verde lima | `#9be33a` | primera foto, abanico de líneas |
| Morado | `#8a4fd6` | primera foto, bandas y ojos |
| Rosa pálido | `#f7b6cf` | tercera foto, líneas finas |
| Blanco hueso | `#fff6ea` | segunda y tercera foto, ojos y contornos |

Propuesta: sumar **turquesa** y **naranja** a `CREMAS` (hoy no están), y dejar las
demás. No lo implementé todavía.

### Estilos que se repiten

1. **Bandas de rayas paralelas**: varias líneas juntas en colores alternados (primera
   foto, a lo largo del cuerpo).
2. **Zigzag y ondas**: el glaseado va y viene en zigzags apretados, sobre todo en
   amarillo y verde (primera y tercera foto).
3. **Puntitos de glaseado**: gotas de colores en hileras, sin orden fijo (primera
   foto). Son el adorno más fácil de repetir. No son grageas.
4. **Abanico de líneas**: un grupo de hilos que salen de un punto (primera foto, verde
   lima). Pide un trazo nuevo, parecido al de la roseta pero plano.
5. **Cara de glaseado**: ojos de puntitos o de media luna, sonrisa en curva. Los ojos
   blancos con pupila oscura de la segunda foto piden un trazo de dos capas.
6. **Pelo y rizos**: rizos apretados de glaseado sobre la cabeza (tercera foto).
7. **Ropa y accesorios**: pantalones con botones, cinturón de puntitos, bolsa con
   asa (segunda foto). Es un estilo de figura, no de adorno.
8. **Contorno con puntitos**: una línea de puntos alrededor de la cabeza o la base
   (tercera foto).
9. **Capa de chocolate con borde**: el chocolate cubre la cabeza y el borde se
   deja con puntitos.

### Qué implica para la app

- **Trazo de rayas dobles** y **zigzag** como herramientas propias, con el ancho
  del hilo fino que ya tenemos.
- **Abanico de líneas** como variante de la roseta.
- **Cara con ojos blancos y pupila**: el carita actual solo pinta ojos oscuros.
- **Puntitos repetibles** con un clic o con un arrastre que los distribuya.

Estos son pendientes. Lo que sí quedó hecho en el código es el hilo fino y la capa de
baño.

## 5. Corrección: no se usan grageas, todo es glaseado

Lo confirmó quien conoce las guaguas: **las grageas no son comunes**. Los puntos,
bolitas y contornos son gotas de glaseado. Tres fotos más lo muestran:

- **Guagua con mano de glaseado** (primera foto): una mano rosada dibujada con
  glaseado sobre el cuerpo, uñas en blanco; ojos de puntos verdes grandes, sonrisa
  rosada. El glaseado puede dibujar figuras completas, no solo líneas.
- **Plato de guaguas y figuras** (segunda foto): zigzags apretados en rojo, amarillo,
  celeste y blanco, uno por color, en bandas paralelas; espirales, corazones y
  rulos sueltos; ojos de punto en la cabeza. El borde de cada pieza suele llevar una
  línea de glaseado.
- **Guaguas con ramas** (tercera foto): una rama o "árbol" de glaseado amarillo por el
  centro del cuerpo, con hojas en curva; puntos rosados y celestes alrededor; cara con
  ojos y boca de puntos.

### Cromática de estas fotos

Rojo, amarillo, celeste, blanco, rosado y verde. Son colores primarios y vivos;
el morado casi no aparece en el glaseado (aparece en la colada).

### Estilos nuevos

- **Figuras dibujadas**: manos, corazones, espirales.
- **Bandas de zigzag**, una por color, en franjas paralelas.
- **Rama con hojas** por el centro del cuerpo.
- **Ojos y bocas de punto**: la cara se arma con puntos de glaseado.

### Qué se aplicó en la app

- La herramienta **Grageas** se cambió por **Puntos**: un toque pone una gota plana de
  glaseado del color elegido. Las guaguas guardadas con grageas se siguen leyendo.

### Pendientes

- Espiral y corazón como trazos asistidos.
- Zigzag automático a lo largo de una banda.
- Rama con hojas como plantilla.

## 6. La estructura de la app (rediseño, octubre)

- **El inicio es tu canasta**, no el taller. Desde ahí: «Amasar otra», abrir una guagua o tu cuenta.
  Si quedó una a medio decorar, sale arriba «Tienes una sin terminar · Seguir».
- **El taller**: arriba ✕ · el paso (tocarlo abre «Cómo se hace») · ✓ solo al decorar, porque la masa
  cruda no se guarda. Abajo, solo herramientas; deshacer y rehacer van con ellas.
- **La ✕ vuelve a la canasta** y avisa si algo se pierde: la decoración se puede guardar antes; la masa
  cruda no, así que el aviso solo ofrece salir o quedarse.
- **La instrucción de cada paso** sale la primera vez y se desvanece con el primer toque en el lienzo.
  Al sacar del horno, ese mismo lugar dice cómo salió.
- **Decorar**: hilo (con tres grosores), puntos y la brocha de cobertura, que pinta a mano en vez de
  bañar la guagua entera. El aro elige el color; el + trae carita, pasas, mordisco y sorpréndeme.
- **Guardar** pide el nombre (por defecto «Guagua», sin sugerencias) y luego ofrece regalarla,
  amasar otra o seguir decorando.
- **Regalar y compartir son dos historias distintas.** Regalarla es para alguien en concreto: primero
  para quién es (para, de y un mensaje si quieres) y después qué más va en la canasta (solo la guagua,
  vale por una guagua, colada morada, pásala); le llega un enlace. Compartirla es para tus redes o tu
  perfil: una imagen, y si la amasaste pensando en alguien que ya no está, «En memoria de». No lleva
  vales ni destinatario, y quien abre el enlace ve «Paco amasó una guagua», no «te regalaron».
- **Un solo sistema de componentes**: principal rojo en píldora (uno por pantalla), secundario con
  contorno crema, terciario subrayado, iconos en círculos de vidrio, lo elegido en rosa. Las hojas son
  oscuras como el resto: nada de superficies crema ni franjas de colores, para no romper lo sobrio.

## 7. Tipografía, área segura y contraste

- `button{font:inherit}` con un selector de clase le gana a `.b`, `.tool`… y todos los botones salen
  en 400 y con el interlineado del cuerpo. La herencia va dentro de `:where()`, sin especificidad.
- Los botones y las píldoras llevan `line-height:1`: con el 1.6 del cuerpo, el texto no se centra.
- Abajo basta `max(12px, área segura − 8px)`: la barra de inicio del iPhone ya deja aire.
- El rojo de los botones es `#d63a22` (blanco encima 4.7:1); el texto terciario sobre vidrio, `#b3a2c2`.

## 8. Poner cosas: carita, mordisco y figuras de mazapán

- **No son herramientas de la bandeja.** Como los stickers y el texto del Marcado, se eligen en el +,
  se ponen con un toque y quedan elegidas con su propia barra flotante: tamaño (carita y figuras),
  otra (figuras), quitar y listo. Tocar otra vez el pan las cambia de lugar. Elegir una manga, deshacer
  o cambiar de paso termina lo que se estaba poniendo.
- **Figuras de mazapán** (op 9 `[9, figura, tamaño, x, y, z, nx, ny, nz]`): flor, hoja, corazón,
  estrella, moño y uvas, con su color de mazapán. La pasa va en la misma rejilla.
- **El color que no cambiaba:** el material pinta las caras de atrás del color de la miga, y la cinta
  del glaseado tenía los triángulos hacia adentro. Se veía siempre «por dentro», color crema. Los
  triángulos de una malla hecha a mano tienen que mirar hacia afuera.
- El visor ya tiene una propiedad `figura` (el plato que gira): un método con ese nombre queda tapado.

## 9. El punto del horno, el grosor y el baño

- **La franja del termómetro tiene que ser la misma que juzga el horno.** El marco blanco estaba sobre
  la zona «blanquita» (46–60 %): quien la sacaba ahí leía «le faltó horno». Ahora el marco va donde
  `punto()` dice «en su punto» (0.92–1.08 de 1.6: 57.5–67.5 %), con el dorado dentro, y la instrucción
  dice «sácala doradita».
- El hilo empieza en el grosor más grueso.
- **La brocha es un baño, no una línea.** Los trazos de cobertura no se dibujan uno encima de otro: hay
  una sola capa que copia al pan un poco por fuera, y cada vértice guarda su distancia al trazo más
  cercano. El borde se corta en el radio interpolando esa distancia, así sale redondo aunque la malla
  sea gruesa. Mientras se pinta solo se calcula el tramo nuevo (unos 2 ms por trazo). Lo que se pone
  después (hilo, puntos, figuras) queda encima de la capa.

## 10. Guardar y compartir

- **✓ guarda; Compartir es todo lo demás.** En el taller ya no hay «Regalar»: el botón es Compartir.
  Pide el nombre, muestra la tarjeta que va a salir y pregunta «¿Cómo la compartes?»:
  · **En tus redes**: tu creación, una imagen para historias o perfil. Un paso: se comparte ahí mismo.
  · **A alguien**: para quién (para, de, un mensaje) y qué más va en la canasta (vale, colada, pásala).
    Le llega un enlace para abrirla, comérsela y cobrar el vale. Tres pasos.
  · **En memoria de alguien**: a quién recuerdas y unas palabras; sale como imagen. Dos pasos.
- La tarjeta de arriba cambia con cada elección («Amasé una guagua», «Te regalo una guagua»,
  «En memoria de…»), así se entiende qué se va a compartir antes de compartirlo.
- La canasta (guardada y cada pieza) tiene un solo botón: Compartirla, que lleva al mismo lugar.
