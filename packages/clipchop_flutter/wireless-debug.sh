#!/bin/bash
# Wireless ADB debugging helper for ClipChop Flutter

ADB="/opt/homebrew/share/android-commandlinetools/platform-tools/adb"

echo "=== ClipChop Wireless Debugging Setup ==="
echo ""

# Check if we have arguments
if [ $# -eq 0 ]; then
    echo "Usage:"
    echo "  ./wireless-debug.sh pair <ip:port> <pairing-code>"
    echo "  ./wireless-debug.sh connect <ip:port>"
    echo "  ./wireless-debug.sh status"
    echo "  ./wireless-debug.sh usb-to-wifi"
    echo ""
    echo "Example:"
    echo "  ./wireless-debug.sh pair 192.168.1.101:36807 502768"
    echo "  ./wireless-debug.sh connect 192.168.1.101:36313"
    echo ""
    exit 0
fi

case "$1" in
    pair)
        if [ $# -lt 3 ]; then
            echo "Error: Need IP:PORT and PAIRING_CODE"
            echo "Usage: ./wireless-debug.sh pair 192.168.1.101:36807 502768"
            exit 1
        fi
        echo "Killing ADB server..."
        $ADB kill-server
        sleep 1
        echo "Starting fresh ADB server..."
        $ADB start-server
        sleep 1
        echo "Pairing with $2 using code $3..."
        $ADB pair "$2" "$3"
        ;;
    connect)
        if [ $# -lt 2 ]; then
            echo "Error: Need IP:PORT"
            echo "Usage: ./wireless-debug.sh connect 192.168.1.101:36313"
            exit 1
        fi
        echo "Connecting to $2..."
        $ADB connect "$2"
        echo ""
        echo "Connected devices:"
        $ADB devices
        ;;
    status)
        echo "ADB devices:"
        $ADB devices -l
        ;;
    usb-to-wifi)
        echo "This enables wireless debugging via USB first."
        echo ""
        echo "Step 1: Connect phone via USB"
        $ADB devices
        echo ""
        read -p "Is your phone showing as 'device'? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Enabling TCP/IP mode on port 5555..."
            $ADB tcpip 5555
            sleep 2
            echo ""
            echo "Get your phone's IP from Settings > About Phone > Status"
            read -p "Enter phone IP: " PHONE_IP
            echo "You can now disconnect the USB cable."
            read -p "Press Enter when USB is disconnected..."
            echo "Connecting wirelessly to $PHONE_IP:5555..."
            $ADB connect "$PHONE_IP:5555"
            echo ""
            echo "Done! Your phone should now be connected wirelessly:"
            $ADB devices
        fi
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use: pair, connect, status, or usb-to-wifi"
        ;;
esac
