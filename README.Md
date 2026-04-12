<div align="center">
  <img src="./logo.png" alt="BioMolecule Inc Logo" width="300" style="border-radius: 20px; margin-bottom: 20px;" />

  # BioMolecule Inc
  
  **Transformando la predicción estructural de proteínas en una experiencia accesible, rápida y visual.**
  
  [![Hackathon](https://img.shields.io/badge/Hackathon-Impacthon-brightgreen.svg)]()
  [![Equipo](https://img.shields.io/badge/Equipo-Los_RAM--ones-blue.svg)]()
</div>

---

## 🧬 ¿Quiénes Somos?
Somos **Los RAM-ones**, un equipo multidisciplinar participando en el **Impacthon ETSE 2026**. Nuestro objetivo es democratizar el acceso a herramientas bioinformáticas avanzadas mediante soluciones de software intuitivas y escalables, cerrando la brecha entre la capacidad técnica de los supercomputadores y los investigadores del sector biomédico y biológico.

## 💡 ¿Qué solución proponemos?
Actualmente, el uso de herramientas punteras de predicción como AlphaFold requiere altos conocimientos técnicos: manejo de terminales bash, conexión a clústeres remotos por SSH, scripting, y una espera a ciegas sin conocer de antemano los tiempos de cómputo o los costes operativos (cloud/FinOps).

**BioMolecule Inc** es una plataforma web Full-Stack diseñada desde cero para eliminar esta brecha de complejidad. Proporcionamos una interfaz gráfica (GUI) premium e intuitiva que permite a cualquier investigador:
- Enviar secuencias FASTA simplemente copiando y pegando o subiendo archivos, sin tocar la línea de comandos.
- Visualizar interactivamente modelos atómicos 3D avanzados directamente desde cualquier navegador web.
- Entender el contexto biológico, el coste computacional y las métricas de fiabilidad en un panel unificado de nueva generación.

## ⚙️ ¿Qué hace BioMolecule Inc? (Características Principales)
- **🧠 Predicción de Estructuras (AlphaFold Wrapper):** Conexión automatizada al motor de predicción que genera coordenadas estructurales a partir de secuencias primarias.
- **🔬 Visualizador 3D Avanzado (Mol*):** Renderizado gráfico molecular embebido, permitiendo estudiar dominios, regiones intrínsecamente desordenadas (IDR) y superposiciones sin instalar software de terceros.
- **📊 Análisis de Confianza Estructural (pLDDT):** Algoritmos nativos en el frontend que analizan e inyectan los niveles de fiabilidad (pLDDT) de la IA en los átomos del modelo 3D en tiempo real, mostrándolo visualmente junto a gráficas de calidad por residuo.
- **💬 Asistente IA (GAIVE):** Un experto bioinformático inteligente integrado en la plataforma que asiste al científico analizando la morfología de las secuencias, identificando problemas y ayudando a estructurar reportes clínicos en PDF auto-generados.
- **💸 Panel Biológico y FinOps:** Estimación anticipada de costes, consumo de infraestructura y métricas físico-químicas de las proteínas.

---

## 🛠 Arquitectura Tecnológica
El proyecto está dividido en un ecosistema separado para garantizar máxima escalabilidad:

- **Frontend:** Desenvolvido con React + Vite + TypeScript. Estilizado usando CSS responsivo y componentes modulares (`lucide-react`, ecosistema `PDBe-Molstar`, utilidades `jspdf`).
- **Backend:** Arquitectura sólida en Java 21 con el framework Spring Boot. Implementa sistema MVC, seguridad de rutas y consumo de una API REST externa biológica (CESGA Mock API).
- **Base de Datos:** Persistencia relacional del historial y usuarios basada en PostgreSQL (Neon Cloud) / perfil H2 en memoria para pruebas locales.

---

## 🚀 Despliegue en Local (Guía de Ejecución)

### Requisitos Previos:
- **Java 21+** instalado en tu sistema.
- **Node.js** (v18 o v20 recomendadas) y **npm**.

### 1. Despliegue del Backend
El Backend gestiona las cuentas de los investigadores y sirve de puente hacia el supercomputador (mock).

```bash
# Entrar a la carpeta del backend
cd Back-End

# Iniciar servidor Spring Boot
./gradlew bootRun
```
*(El backend arrancará en el puerto `8080`. Por defecto está configurado para conectar a PostgreSQL; si sufres restricciones de tu red local, puedes modificar el `application.properties` para usar la base de datos embebida H2).*

### 2. Despliegue del Frontend
Levanta la interfaz gráfica donde interactúan los usuarios.

```bash
# En una terminal nueva, entrar a la carpeta del frontend
cd Front-End

# Instalar absolutamente todas las dependencias
npm install

# Instalar dependencias específicas generadas en el último tramo de la hackathon
npm install jspdf qrcode
npm install --save-dev @types/qrcode

# Arrancar la aplicación de Vite en modo de desarrollo
npm run dev
```

La aplicación web estará disponible en **http://localhost:5173**. 
Crea tu cuenta de investigador en la pantalla de bienvenida y simula tu primera estructura.
