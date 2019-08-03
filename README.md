# act-overlay-sonsho
"Skada" inspired damage meters for Final Fantasy XIV using ACTWebSocket. Minimal style meters that display the important "in the moment" information. Uses colors from Final Fantasy Logs to keep consistency for the number crunchers.

# Dependencies

- Advanced Combat Tracker
- OverlayPlugin

# Installation Instructions

The easiest way to install and get up and running quickly is outlined below.

## Required Files

- Advanced Combat Tracker, [latest version](https://advancedcombattracker.com/includes/page-download.php?id=56)
- OverlayPlugin, [latest version](https://github.com/ngld/OverlayPlugin/releases/latest)

## Steps

1. Follow the [guide](https://gist.github.com/TomRichter/e044a3dff5c50024cf514ffb20a201a9#ffxiv-act-installation-instructions) by [TomRichter](https://github.com/TomRichter),  to install the latest version of `ACT`.

2. Install `OverlayPlugin` after `ACT` is installed.

3. That's it!

# Setup

We will setup a WebSocket Server to serve our data to Sonshō using `OverlayPlugin` and then add the overlay page to it.

1. OverlayPlugin WSServer

   Once your `ACT` is started up again, go to `Plugins` > `OverlayPlugin WSServer`, and fill out the following information:

   | Field | Value |
   | --- | --- |
   | **IP Address** | `[::1]` *or* `127.0.0.1` |
   | **Port** | `10501` *or* Any unused port |

   When that is done, hit `Start` and ensure the Status says *Running*.

2. OverlayPlugin.dll
  1. To add the overlay, first we will click on `New`.
  2. Name it `Sonsho` and make sure it's of type `Mini Parse`.
  3. Add to `URL`: `http://localhost:3000/?HOST_PORT=ws://{IP Address}:{Port}/`

     Change the values in curly braces to the values you put into the WSServer, example `http://localhost:3000/?HOST_PORT=ws://[::1]:10501/`
  4. Change the `Max. framerate` to 60.

# Inspiration

- Skada <https://www.curseforge.com/wow/addons/skada/>
- MopiMopi <https://haeruhaeru.github.io/mopimopi/>
- FFLogs <http://www.fflogs.com>