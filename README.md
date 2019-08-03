# act-overlay-sonsho
"Skada" inspired damage meters for Final Fantasy XIV using ACTWebSocket.

# About

# Required Files


# Installation Instructions

- Advanced Combat Tracker, https://advancedcombattracker.com/includes/page-download.php?id=56
- OverlayPlugin, latest version, https://github.com/ngld/OverlayPlugin/releases/latest

Follow the guide by TomRichter, https://gist.github.com/TomRichter/e044a3dff5c50024cf514ffb20a201a9#ffxiv-act-installation-instructions toinstall the latest version of FFXIV ACT.

Then install OverlayPlugin after ACT is installed and restart ACT if necessary.

OverlayPlugin WSServer

- IP Address: [::1]
- Port: Any port you want, default is 10501
- Start

OverlayPlaugin.dll

- New -> Sonsho -> Type: Mini Parse
- URL: http://localhost:3000/?HOST_PORT=ws://{IP Address}:{Port}/
    - Change the values in curly braces to the values you put into the WSServer, example http://localhost:3000/?HOST_PORT=ws://[::1]:10501/
- Sort Key -> remove
- Sort type -> Do not sort
- Max. framerate -> 60

Other example: https://haeruhaeru.github.io/mopimopi/?HOST_PORT=ws://[::1]:10501/