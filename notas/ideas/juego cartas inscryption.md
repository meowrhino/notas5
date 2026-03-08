# juego cartas inscryption


array de cartas
cada carta tiene:

nombre
un emoji (es texto es la ilustración de la carta)
un ataque
y una defensa
y ataque directo

el diseño de la carta es un rectangulo con borde y sombra (sin border radius)
un cuadrado con el emoji centrado ahí un poquito grande
abajo un rectángulo donde si tiene efecto se coloca ahi el icono del efecto
y abajo en la esquina izquierda el ataque en rojo
en medio el ataque directo en azul
y abajo en la esquian derecha la defensa env erde

(todo son colores planos en plan rojo es F00, azul es 00F y verde es 0F0

los efectos estan en otro array
tienen un icono todos
y el icono no sé qué puede ser

¿como lo ves para la estructura?



cuando abres el index.html tienes 2 botones
"ver cartas" y "crear cartas" 

y en el "crear cartas" tienes un creador de cartas donde puedes guardar sus datos y te añade esa carta al data.json
igual el data.json en lugar de tener todos esos datos de todas las cartas tiene un array con las cartas que vaya a un .json de cada carta, ¿no? y entonces el boton de guardar en la parte de crear cartas te crea un nuevo archivo y añade esa instancia al data.json

de momento esto de crear cartas solo funciona si estas desplegando la web con el liveserver del visual studio code (no se como podria revisar esta condicion) asi que si no lo estas haciendo podria dar un mensaje de error cuando le des en plan "live server not connected"


esta mas o menos [https://meowrhino.github.io/cards1/](https://meowrhino.github.io/cards1/)

