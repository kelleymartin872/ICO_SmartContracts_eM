#!/bin/bash

rm -rf ./test/testrpc-db
mkdir ./test/testrpc-db
testrpc \
    --db ./test/testrpc-db \
    --account="0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d,600000000000000000000000" \
    --account="0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1,600000000000000000000000" \
    --account="0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c,600000000000000000000000" \
    --account="0xa453611d9419d0e56f499079478fd72c37b251a94bfde4d19872c44cf65386e3,600000000000000000000000" \
    --unlock 0 \
    --unlock 1 \
    --unlock 2 \
    --unlock 3
