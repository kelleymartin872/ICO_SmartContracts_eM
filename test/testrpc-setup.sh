#!/bin/bash

rm -rf ./test/testrpc-db
mkdir ./test/testrpc-db
cp ./migrations/config-test.json ./migrations/config.json
testrpc \
    --db ./test/testrpc-db \
    --account="0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d,600000000000000000000000" \
    --account="0x78bb80d0f32d3dc3bc48f244623034d229fd293f064465fea4548559abfd467d,600000000000000000000000" \
    --account="0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1,0" \
    --account="0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c,0" \
    --account="0xa453611d9419d0e56f499079478fd72c37b251a94bfde4d19872c44cf65386e3,0" \
    --account="0xab4892bb488989e010874b892c24678190d8959389a9889b92c82985719a0bcd,0" \
    --account="0xa23089174094774bcd8437db487e3201984ebbdeacef902381804ddd23094747,0" \
    --account="0xa8953b27834c96e28731f3249875f09384b029438d23904adb78234283872341,600000000000000000000000" \
    --account="0xd5d4521edfb020c21f5984e2ddcae5acf1c4419adeb2ed85ae0d7f37e3a2b5e6,600000000000000000000000" \
    --account="0x9d5f653f7120d0671f9f5bcb74dfd04b0ff5798892934b2c9c09e8b330fd90ed,600000000000000000000000" \
    --unlock 0 \
    --unlock 1 \
    --unlock 2 \
    --unlock 3 \
    --unlock 4 \
    --unlock 5 \
    --unlock 6 \
    --unlock 7 \
    --unlock 8 \
    --unlock 9
