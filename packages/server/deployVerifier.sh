#! /usr/bin/sh

PRIVATE_KEY=`cat ../contracts/.env | grep PRIVATE_KEY | sed 's/PRIVATE_KEY=//'`
cd ../contracts
echo `forge create Verifier --private-key $PRIVATE_KEY | awk '/Deployed to: / {print $3} '`
