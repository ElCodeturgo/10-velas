// js/modules.js — Definiciones de los tres módulos del juego

const MODULES = {
  hospital: {
    id: 'hospital',
    title: 'Hospital Abandonado',
    icon: '🏥',
    tagline: 'La cura puede ser peor que la enfermedad...',
    description: `El Hospital Psiquiátrico Santa Clara cerró sus puertas hace veinte años, pero sus pasillos nunca quedaron verdaderamente vacíos. Cuando la oscuridad cayó sobre el mundo, un puñado de supervivientes buscó refugio entre sus muros de hormigón descascarado, convencidos de que el grosor de sus muros los mantendría a salvo.

El generador de emergencia aún funciona en el sótano, pero el combustible se agota. Las luces parpadean cada vez más seguido. Y en los pasillos del ala psiquiátrica, algo se mueve entre las camas vacías y las camisas de fuerza olvidadas.

Lo más perturbador no es el sonido de pasos en el piso de arriba cuando todos estáis en la planta baja. Es que los pacientes dejaron atrás sus diarios. Y algunas de las cosas que escribieron... parecen describir exactamente lo que está pasando ahora.`,
    atmosphere: 'oscuro, claustrofóbico, psicológico, paranoico',
    areas: [
      'Sala de Urgencias', 'Pabellón Psiquiátrico', 'Quirófanos', 
      'Sótano (Generador)', 'Farmacia', 'Azotea', 'Archivo Médico'
    ],
    objective: 'Encontrar las llaves del camión de la planta baja y escapar por la salida de emergencia norte antes de que el generador falle por completo.',
    gmNotes: 'Ellos se manifiestan aquí como figuras que imitan a los antiguos pacientes: silenciosas, erráticas, con movimientos que no son del todo humanos. Han aprendido a esconderse dentro de los uniformes del hospital.',
    startingScene: `Las luces del techo parpadean en morse desesperado. Tres bombillas han estallado esta noche ya. Os encontráis en la sala de urgencias, que convertisteis en campamento hace cuatro días. Hay seis catres, dos linternas con batería para quizás dos horas más, y una radio que solo capta estática desde ayer. El generador, cuatro plantas más abajo, lleva una hora emitiendo un sonido que no augura nada bueno.

La puerta principal está barricada. La puerta trasera, sin embargo... nunca regresó la persona que fue a verificar que estuviera cerrada.`
  },

  muelle: {
    id: 'muelle',
    title: 'Muelle en Ruinas',
    icon: '⚓',
    tagline: 'El mar siempre ha guardado secretos...',
    description: `El Puerto Industrial de la Bahía Negra lleva quince años abandonado. Cuando las compañías navieras cerraron, dejaron atrás grúas oxidadas, almacenes llenos de contenedores y el esqueleto metálico de lo que alguna vez fue el centro neurálgico del comercio costero.

Ahora los supervivientes se aferran a ese esqueleto. Los almacenes del Muelle 7 se convirtieron en fortaleza improvisada: gruesas paredes de metal, entradas limitadas, visibilidad en todas direcciones.

Pero desde hace dos noches, hay algo en el agua. No todo lo que nada es pez. Y anclado a kilómetro y medio de la costa, hay un barco con luces encendidas. Nadie sabe quién lo tripula. Pero es la única luz en un horizonte completamente negro.`,
    atmosphere: 'húmedo, industrial, aislado, la oscuridad llega del mar',
    areas: [
      'Almacenes del Muelle 7', 'Muelle Principal', 'Grúas Oxidadas',
      'El Barco Anclado (M/V Noche Eterna)', 'Oficinas Portuarias', 'Espigón Roto', 'Sala de Máquinas'
    ],
    objective: 'Encontrar una embarcación funcional, cruzar la bahía y abordar el barco anclado antes de que Ellos corten el camino al mar.',
    gmNotes: 'Ellos emergen del agua: criaturas que alguna vez fueron humanas, ahora retorcidas por algo que vive en las profundidades. Se mueven con fluidez desconcertante sobre superficies mojadas y temen la luz directa, aunque el agua salada parece amortiguar su debilidad.',
    startingScene: `La niebla ha tragado el horizonte. Solo queda visible la luz ámbar del barco anclado, parpadeando entre los bancos de bruma como un faro moribundo. El viento trae olor a sal, aceite quemado y algo más: algo orgánico que no debería estar aquí.

Estáis en el almacén. Las paredes de metal retumban con el viento del norte. Hay un bote de remos cerca del espigón, y en la oficina portuaria podría haber algo mejor. Pero la oficina queda al otro lado del muelle principal. Y lleváis media hora escuchando algo arrastrarse por el tejado.`
  },

  faro: {
    id: 'faro',
    title: 'La Luz del Faro',
    icon: '🔦',
    tagline: 'No todo lo que brilla es salvación...',
    description: `Cuando la oscuridad cayó, el faro de Punta Ceniza se apagó como todo lo demás. Eso duró exactamente seis horas.

Nadie encendió el generador. Nadie subió las escaleras. Nadie giró el mecanismo de la lente. Y sin embargo, la luz volvió sola. Una luz diferente: más lenta, más cálida, casi naranja. Y desde entonces no se ha apagado.

Para los supervivientes dispersos por treinta kilómetros de costa devastada, ese faro se convirtió en el único punto de referencia. En el único plan posible. Caminar hacia la luz. Encontrar a los demás. Sobrevivir juntos.

Pero nadie que ha llegado al faro ha podido transmitir un mensaje de vuelta.`,
    atmosphere: 'costero, aislado, misterioso, esperanzador pero inquietante',
    areas: [
      'Camino Costero', 'Villa Pesquera Abandonada', 'Acantilados',
      'Base del Faro', 'Interior del Faro', 'Sala de la Lente', 'Cala Escondida'
    ],
    objective: 'Llegar al Faro de Punta Ceniza, descubrir quién o qué mantiene la luz encendida, y decidir si esa luz representa salvación o trampa.',
    gmNotes: 'La naturaleza de Ellos en este módulo es ambigua: quizás son la oscuridad personificada, quizás algo más antiguo que el propio faro. Lo que está claro es que temen aproximarse al faro pero han comenzado a rodear el camino que lleva a él. La luz del faro es real pero tiene un precio.',
    startingScene: `El camino costero se extiende ante vosotros: cuatro kilómetros de carretera agrietada junto al acantilado, con el Mediterráneo negro como tinta a vuestra derecha y el viento golpeando desde el oeste. La luz del faro pulsa cada doce segundos. Doce segundos de esperanza, doce de oscuridad.

Lleváis linternas para quizás tres horas. La villa pesquera está a un kilómetro y puede haber suministros, pero también hay señales de que algo estuvo allí antes que vosotros. Y a lo lejos, entre los acantilados, hay movimiento en la oscuridad.`
  }
};
