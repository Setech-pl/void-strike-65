# VOID STRIKE 65 — Windows quick start

**The game is one file: the disk image `void-strike-65.atr`.**
You do not need Git, Node.js, a terminal, or any Atari experience.
Altirra is a free program that runs Atari games on Windows.

## Start the game

1. Open the [VOID STRIKE 65 Releases page](https://github.com/Setech-pl/void-strike-65/releases).
   Download the game ZIP attached to the newest release, when available.
   **No release archive is published yet.** For now, open the
   [project page](https://github.com/Setech-pl/void-strike-65/tree/feature/encounter-director),
   click **Code → Download ZIP**, and use the game files in its `dist` folder.
   This is the current development build, not a published release.
2. Right-click the game ZIP in Windows and choose **Extract All**, then
   **Extract**. Open the new folder. Find `void-strike-65.atr` (inside `dist`
   if you downloaded the project ZIP).
3. Download the latest stable Altirra from the
   [official Altirra page](https://www.virtualdub.org/altirra.html).
   Choose the **x86/x64** download for most Windows PCs, not the source code
   or a test version. Windows on ARM users can choose the ARM64 package.
4. Right-click the Altirra ZIP and choose **Extract All**, then **Extract**.
5. Open the extracted Altirra folder and double-click **Altirra64.exe**.
   On a 32-bit Windows PC, use **Altirra.exe** instead. If a first-run setup
   appears, use an **XL/XE** computer, **PAL** video, at least **64 KB** of
   memory, and the built-in **AltirraOS**. Turn **BASIC** off. These settings
   can also be changed under **System → Configure System**.
   Start with the built-in firmware; no separate Atari ROM download is needed.
6. In Altirra, choose **File → Boot Image**, select `void-strike-65.atr` from
   the extracted game folder, and click **Open**. Dragging the file into the
   Altirra screen also works; if it only mounts the disk, use **File → Boot
   Image**.
7. Wait for the title loader and the main menu (about eleven seconds from
   disk).
   Select **START GAME** and press the fire button described below.

You can also download just the [current disk image](../dist/void-strike-65.atr):
on its GitHub page, click **Download raw file**. Then continue from step 3.

## Controls

The game uses **joystick port 1** and one **fire button**. For keyboard play,
choose **Input → Port 1 → Arrow keys → Joystick (port 1)**. Here, the last
part is the name of the keyboard preset. It uses the **arrow keys** and
**left Ctrl**. If that preset is missing, open **Input → Input Mappings**
and enable the keyboard joystick for port 1. Older versions may call this
**Input → Joystick**. Check the assigned keys if you use a custom mapping.
Click inside the game window before playing.

| What you want to do | Game control | With the keyboard joystick above |
| --- | --- | --- |
| Move the player fighter | Joystick directions | Arrow keys |
| Shoot | FIRE; hold for repeated bursts | Left Ctrl; hold to keep firing |
| Move through a menu | Up / Down | Up / Down arrows |
| Change an option | Left / Right | Left / Right arrows |
| Select, confirm, or return from a score screen | FIRE | Left Ctrl |
| Open the pause menu | Atari OPTION | F4 in Altirra's default mapping |
| Resume from the pause menu | Atari OPTION | F4 again |

These PC keys are Altirra mappings. The game itself has no separate keyboard
movement controls. A connected gamepad must also be mapped to joystick port 1.
On some laptops, you may need **Fn + F4** to send F4.

## Full screen

Press **Alt + Enter** to fill the screen. Press it again to return to a window.
This changes Altirra's display, not the game's controls.

## About the ATR disk image

`void-strike-65.atr` is a **disk image**: a file containing a virtual floppy
disk. It is **not a Windows executable**. Do not try to run it as an ordinary
program. Altirra boots the loader from its first virtual disk drive, then shows
the main menu.

## Troubleshooting

| Problem | What to try |
| --- | --- |
| Altirra shows SELF TEST | The game has not booted. Check XL/XE, PAL, at least 64 KB, and BASIC off under **System → Configure System**. Then use **File → Boot Image** to reopen the extracted ATR. |
| The ATR does not start | It must be opened as a disk image. Use **File → Boot Image** and select the ATR. Do not send it to an executable-only loader. |
| You are opening the game inside a ZIP | Close the ZIP window. Right-click the ZIP, choose **Extract All**, and open the file from the new folder. |
| The title is wrong, or an old version appears | Download the current game again using the links above. Open its `void-strike-65.atr`, not an older copy, preview, boot BIN, or manifest. |
| The game does not respond | Click the game window. Enable a keyboard joystick or gamepad on **port 1** in **Input**. Check its mapping. Use FIRE to select **START GAME**. If paused, press F4 again. |
| Altirra will not open, or reports missing files | Extract the whole emulator ZIP first. Run **Altirra64.exe** from the extracted folder. Check that you chose the download for your Windows PC. |
| You need to start again | Choose **System → Cold Reset**, or press **Shift + F5**. This restarts the emulated Atari. If the game does not return, choose **File → Boot Image** and reopen the correct ATR. |

A cold restart loses the current game and scores held in memory.

## Which file should I use?

| File | Use it for |
| --- | --- |
| **void-strike-65.atr** | **The game:** boot it as a virtual floppy disk in Altirra. |
| void-strike-65-boot.bin | A packaging component; do not open it to play. |
| void-strike-65-manifest.json | Build information; do not open it to play. |

The existing runtime captures and boot checks use Atari800. This guide does
not claim a new Altirra playtest or completed real-hardware acceptance.

Game controls follow the [current game documentation](game-design.md) and
[runtime source](../src/main.s). Emulator setup follows the
[official Altirra page](https://www.virtualdub.org/altirra.html); default
shortcuts were checked in its 4.40 source package, available on that page.

[Back to the project](../README.md)
