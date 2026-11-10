/* 聊天室裡的兩隻貓、螢光球、咬泡泡與談戀愛。只在這台瀏覽器裡跑，不上傳。 */
import { Droop } from "./droop.js";
export function mountRoomPets() {
    "use strict";
    const DATA = {"W":32,"H":20,"pal":{"gray":{"k":"#010101","b":"#a79e99","d":"#6f645e","p":"#efaea1","w":"#fefdfb","t":"#e27880","f":"#807873"},"brown":{"k":"#010101","b":"#cd804e","d":"#c86b2b","p":"#ebcebf","w":"#fcfefc","t":"#e27880","f":"#ac6230"}},"frames":{"gray":{"sit":["///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbwbbbwbbdk/....kkkbbbkbkbkbbbkkk/......kdbbbbbbbbbdk/....kkkbbbbbbbbbbbkkk/.......kkbbbbbbbkk....kkk/.........kbbbbbk.....kdddk/.........kppbbddk...kdbdbk/.........kpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kddkbbkbbkk/..........kkkkkkkk"],"walk":["///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kddk.........kbbbbbbbbbwbbkk..k/kbbk.........kbbbbbbbbbkbbbtkk/kddkkkkkkkkkkkbbbbbbbbbbbbbk/.kbbbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbppppppbbbbbk/...kbbkkffkkkkkbbkffk/...kbbkkffk...kbbkffk/...kbbkkffk...kbbkffk/....kk..kk.....kk.kk","////................k.....k/...............kbk...kbk/...kk.........kbpbkkkbpbk/..kbbk........kbppbbbppbbk/.kddk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbpppppppbbbbk/....kbbffkkkkkkkbbfk/....kbbffk.....kbbfk/....kbbkk.......kffk/.....kk..........kk","///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kddk.........kbbbbbbbbbwbbkk..k/kbbk.........kbbbbbbbbbkbbbtkk/kddkkkkkkkkkkkbbbbbbbbbbbbbk/.kbbbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbbpppppppbbbk/...kffkkbbkkkkkffkbbk/...kffkkbbk...kffkbbk/...kffkkbbk...kffkbbk/....kk..kk.....kk.kk","////................k.....k/...............kbk...kbk/...kk.........kbpbkkkbpbk/..kbbk........kbppbbbppbbk/.kddk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbppppppppbbbk/....kffbbkkkkkkkfbbk/....kffbbk.....kfbbk/....kffkk.......kbbk/.....kk..........kk"],"run":["///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kkbbkffkkffkbbkk/......kbbkffkkffkbbk/......kbbkffkkffkbbk/.......kbbkffffkbbk/........kk.kkkk.kk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbdbbdbbdbbbbbbbbbbbbkk.kk/..kkbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbbbkkk/...kbbbbbppppppppppbbbk/..kffbbkkkkkkkkkkkkbbffk/..kfbbk............kbbfk/.kfbbk..............kbbfk/.kbbk................kbbk/..kk..................kk","///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kfbbkkkkkkkbbfkk/.....kfbbk.....kbbfk/.....kfbbk.....kbbfk/....kfbbk.......kbbfk/.....kkk.........kkk","////................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kkkkbbfffbbkkkkk/........kbbfffbbk/.......kbbffffkbbk/........kkkkkk.kk"],"jump":["//////................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbffbpppppppffbbk/...kbbffkkkkkkkkffbbk/....kkkk........kkkk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/.............kbbbbbbbbbkbbbtkk/....kkkkkkkkkkbbbbbbbbbbbbbk/...kbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/.kddbbbbbbbbbbbbbbbbkbbkk/kbbkbbbbbbbbbbbbbbbbbbk/ddkkbbbbbppppppppbbbkk/kkkffbbkkkkkkkkkkkkk/.kffbbk/kffbbk/.kkkk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/...kk........kbbbdbdbbbbbbk/..kbbk.......kbbbbbbbbbwbbkk..k/.kbbk........kbbbbbbbbbkbbbtkk/.kddkkkkkkkkkkbbbbbbbbbbbbbk/..kbbbbdbbdbbdbbbbbbbbbbbkk.kk/...kbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbkkkkk/....kbbbbbbbbbbbbbbbk/....kbbbfbpppppfbbbbk/.....kbbfkkkkkkfbbkk/......kbbk....kbbk/.......kk......kk"],"sleep":["///////////...............kkk.....kkk/......kkkkkkkkkpbbkkkkkbbpk/.....kbbdbbdbbkppbdbdbdbppk/....kbbbdbbdbbkbbbdbbbdbbbk/....kbbbbbbbbbkbbbbbbbbbbbk/...kkbbbbbbbbbkdbbbbbbbbbdk/..kdbbbbbbbbkkkbbkkbkbkkbbkkk/..kbdbbbdbbbdbkdbbbbbbbbbdk/...kkkkkkkkkkkkbbbbbbbbbbbkkk","//////////...............kkk.....kkk/......kkkkkkkkkpbbkkkkkbbpk/.....kbbdbbdbbkppbdbdbdbppk/....kbbbdbbdbbkbbbdbbbdbbbk/....kbbbbbbbbbkbbbbbbbbbbbk/....kbbbbbbbbbkdbbbbbbbbbdk/...kkbbbbbbbkkkbbkkbkbkkbbkkk/..kdbbbbbbbbbbkdbbbbbbbbbdk/..kbdbbbdbbbkkkbbbbbbbbbbbkkk/...kkkkkkkkk...kkkkkkkkkkk"],"scratch":["/...........kkk.....kkk/..........kpbbkkkkkbbpk/..........kppbdbdbdbppk/..........kbbbdbbbdbbbk/..........kbbbbbbbbbbbk/..........kdbbwbbbwbbdk...kk/........kkkbbbkbkbkbbbkkkkbbk/..........kdbbbbbbbbbdkkbbbbk/........kkkbbbbbbbbbbbbbbbkk/...........kbbbbbbbbbbbbkk/...........kbbppppbbbbkkkkkk/...........kbbppppbbffffffffk/...........kbbppppbbffffffffk/.......kk..kbbppppbbkkkkkkkk/......kddk.kbbppppbbk/.......kbbkbbbbbbbbbk/........kddbkffkkbbk/.........kkkkffkkbbk/.............kk..kk","/...........kkk.....kkk/..........kpbbkkkkkbbpk/..........kppbdbdbdbppk/..........kbbbdbbbdbbbk/..........kbbbbbbbbbbbk...kk/..........kdbbwbbbwbbdk.kkffk/........kkkbbbkbkbkbbbkkffffk/..........kdbbbbbbbbbdffffkk/........kkkbbbbbbbbbffffkkkk/...........kbbbbbbbbffkkbbbbk/...........kbbppppbbbbbbbbbbk/...........kbbppppbbbbbbkkkk/...........kbbppppbbkkkk/.......kk..kbbppppbbk/......kddk.kbbppppbbk/.......kbbkbbbbbbbbbk/........kddbkffkkbbk/.........kkkkffkkbbk/.............kk..kk"],"lick1":["///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdkkkkbbbbbdk/....kkkbkppkkbkkbbkkk/......kdkbbktbbbbdk/....kkkbkbbkbbbbbbkkk/.......kkbbkbbbbkk....kkk/........kbbkbbbk.....kdddk/........kbbkbbddk...kdbdbk/........kdbkpbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kddkbbkbbkk/..........kkkkkkkk","///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbkkkkkbkkbbkkk/......kdkppkbbbbbdk/....kkkbkbbkbbbbbbkkk/.......kkbbkbbbbkk....kkk/........kbbkbbbk.....kdddk/........kbbkbbddk...kdbdbk/........kdbkpbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kddkbbkbbkk/..........kkkkkkkk"],"lick2":["/////.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbbkkbkbkkbbkkk/......kdbbbbtbbbbdk...kkk/....kkkbbbbbbbbbbbkkkkdddk/.......kkkppbbddkk..kdbdbk/.........kpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kddkbbkbbkk/..........kkkkkkkk","//////.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbbkkbkbkkbbkkk.kkk/......kdbbbbtbbbbdk..kdddk/....kkkbbbbbbbbbbbkkkdbdbk/.......kkkpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kddkbbkbbkk/..........kkkkkkkk"],"lick3":["//......kkk/.....kpppk/.....kpppk/.....kbbbk.kkk.....kkk/.....kbbbkkpbbkkkkkbbpk/.....kbbbkkppbdbdbdbppk/.....kbbbkkbbbdbbbdbbbk/.....kbbbkkbbbbbbbbbbbk/.....kbbbkkdbbbbbbbbbdk/.....kbbkkkbbkkbkbkkbbkkk/.....kbbbkkdbbbbtbbbbdk/.....kbbkkkbbbbbbbbbbbkkk/.....kbbbbbbbbbbbbbbbbbk...kk/......kkbbbbbbbbbbbbbbbk.kkddk/.......kbbbbbbbbbbbbbbbkkdbbk/.......kbbbbbbbbbbbbbbbbbbkk/.......kbbpppppppppppbbkkk/........kkkkkkkkkkkkkkk","//......kkk/.....kpppk/.....kpppk/.....kbbbk/.....kbbbk.kkk.....kkk/.....kbbbkkpbbkkkkkbbpk/.....kbbbkkppbdbdbdbppk/.....kbbbkkbbbdbbbdbbbk/.....kbbbkkbbbbbbbbbbbk/.....kbbbkkdbbbbbbbbbdk/.....kbbkkkbbkkbkbkkbbkkk/.....kbbbbkdbbbbbbbbbdk/.....kbbkkkbbbbbbbbbbbkkk..kk/......kkbbbbbbbbbbbbbbbk.kkddk/.......kbbbbbbbbbbbbbbbkkdbbk/.......kbbbbbbbbbbbbbbbbbbkk/.......kbbpppppppppppbbkkk/........kkkkkkkkkkkkkkk"]},"brown":{"sit":["///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbwbbbwbbdk/....kkkbbbkbkbkbbbkkk/......kdbbbbbbbbbdk/....kkkbbbbbbbbbbbkkk/.......kkbbbbbbbkk....kkk/.........kbbbbbk.....kdddk/.........kppbbddk...kdbdbk/.........kpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kbbkbbkbbkk/..........kkkkkkkk"],"walk":["///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kddk.........kbbbbbbbbbwbbkk..k/kbbk.........kbbbbbbbbbkbbbtkk/kddkkkkkkkkkkkbbbbbbbbbbbbbk/.kbbbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbppppppbbbbbk/...kbbkkffkkkkkbbkffk/...kbbkkffk...kbbkffk/...kbbkkffk...kbbkffk/....kk..kk.....kk.kk","////................k.....k/...............kbk...kbk/...kk.........kbpbkkkbpbk/..kbbk........kbppbbbppbbk/.kddk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbpppppppbbbbk/....kbbffkkkkkkkbbfk/....kbbffk.....kbbfk/....kbbkk.......kffk/.....kk..........kk","///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kddk.........kbbbbbbbbbwbbkk..k/kbbk.........kbbbbbbbbbkbbbtkk/kddkkkkkkkkkkkbbbbbbbbbbbbbk/.kbbbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbbpppppppbbbk/...kffkkbbkkkkkffkbbk/...kffkkbbk...kffkbbk/...kffkkbbk...kffkbbk/....kk..kk.....kk.kk","////................k.....k/...............kbk...kbk/...kk.........kbpbkkkbpbk/..kbbk........kbppbbbppbbk/.kddk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbppppppppbbbk/....kffbbkkkkkkkfbbk/....kffbbk.....kfbbk/....kffkk.......kbbk/.....kk..........kk"],"run":["///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kkbbkffkkffkbbkk/......kbbkffkkffkbbk/......kbbkffkkffkbbk/.......kbbkffffkbbk/........kk.kkkk.kk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbdbbdbbdbbbbbbbbbbbbkk.kk/..kkbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbbbkkk/...kbbbbbppppppppppbbbk/..kffbbkkkkkkkkkkkkbbffk/..kfbbk............kbbfk/.kfbbk..............kbbfk/.kbbk................kbbk/..kk..................kk","///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kfbbkkkkkkkbbfkk/.....kfbbk.....kbbfk/.....kfbbk.....kbbfk/....kfbbk.......kbbfk/.....kkk.........kkk","////................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kkkkbbfffbbkkkkk/........kbbfffbbk/.......kbbffffkbbk/........kkkkkk.kk"],"jump":["//////................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbffbpppppppffbbk/...kbbffkkkkkkkkffbbk/....kkkk........kkkk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/.............kbbbbbbbbbkbbbtkk/....kkkkkkkkkkbbbbbbbbbbbbbk/...kbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/.kddbbbbbbbbbbbbbbbbkbbkk/kbbkbbbbbbbbbbbbbbbbbbk/ddkkbbbbbppppppppbbbkk/kkkffbbkkkkkkkkkkkkk/.kffbbk/kffbbk/.kkkk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/...kk........kbbbdbdbbbbbbk/..kbbk.......kbbbbbbbbbwbbkk..k/.kbbk........kbbbbbbbbbkbbbtkk/.kddkkkkkkkkkkbbbbbbbbbbbbbk/..kbbbbdbbdbbdbbbbbbbbbbbkk.kk/...kbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbkkkkk/....kbbbbbbbbbbbbbbbk/....kbbbfbpppppfbbbbk/.....kbbfkkkkkkfbbkk/......kbbk....kbbk/.......kk......kk"],"sleep":["///////////...............kkk.....kkk/......kkkkkkkkkpbbkkkkkbbpk/.....kbbdbbdbbkppbdbdbdbppk/....kbbbdbbdbbkbbbdbbbdbbbk/....kbbbbbbbbbkbbbbbbbbbbbk/...kkbbbbbbbbbkdbbbbbbbbbdk/..kdbbbbbbbbkkkbbkkbkbkkbbkkk/..kbdbbbdbbbdbkdbbbbbbbbbdk/...kkkkkkkkkkkkbbbbbbbbbbbkkk","//////////...............kkk.....kkk/......kkkkkkkkkpbbkkkkkbbpk/.....kbbdbbdbbkppbdbdbdbppk/....kbbbdbbdbbkbbbdbbbdbbbk/....kbbbbbbbbbkbbbbbbbbbbbk/....kbbbbbbbbbkdbbbbbbbbbdk/...kkbbbbbbbkkkbbkkbkbkkbbkkk/..kdbbbbbbbbbbkdbbbbbbbbbdk/..kbdbbbdbbbkkkbbbbbbbbbbbkkk/...kkkkkkkkk...kkkkkkkkkkk"],"scratch":["/...........kkk.....kkk/..........kpbbkkkkkbbpk/..........kppbdbdbdbppk/..........kbbbdbbbdbbbk/..........kbbbbbbbbbbbk/..........kdbbwbbbwbbdk...kk/........kkkbbbkbkbkbbbkkkkbbk/..........kdbbbbbbbbbdkkbbbbk/........kkkbbbbbbbbbbbbbbbkk/...........kbbbbbbbbbbbbkk/...........kbbppppbbbbkkkkkk/...........kbbppppbbffffffffk/...........kbbppppbbffffffffk/.......kk..kbbppppbbkkkkkkkk/......kddk.kbbppppbbk/.......kbbkbbbbbbbbbk/........kddbkffkkbbk/.........kkkkffkkbbk/.............kk..kk","/...........kkk.....kkk/..........kpbbkkkkkbbpk/..........kppbdbdbdbppk/..........kbbbdbbbdbbbk/..........kbbbbbbbbbbbk...kk/..........kdbbwbbbwbbdk.kkffk/........kkkbbbkbkbkbbbkkffffk/..........kdbbbbbbbbbdffffkk/........kkkbbbbbbbbbffffkkkk/...........kbbbbbbbbffkkbbbbk/...........kbbppppbbbbbbbbbbk/...........kbbppppbbbbbbkkkk/...........kbbppppbbkkkk/.......kk..kbbppppbbk/......kddk.kbbppppbbk/.......kbbkbbbbbbbbbk/........kddbkffkkbbk/.........kkkkffkkbbk/.............kk..kk"],"lick1":["///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdkkkkbbbbbdk/....kkkbkppkkbkkbbkkk/......kdkbbktbbbbdk/....kkkbkbbkbbbbbbkkk/.......kkbbkbbbbkk....kkk/........kbbkbbbk.....kdddk/........kbbkbbddk...kdbdbk/........kdbkpbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kbbkbbkbbkk/..........kkkkkkkk","///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbkkkkkbkkbbkkk/......kdkppkbbbbbdk/....kkkbkbbkbbbbbbkkk/.......kkbbkbbbbkk....kkk/........kbbkbbbk.....kdddk/........kbbkbbddk...kdbdbk/........kdbkpbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kbbkbbkbbkk/..........kkkkkkkk"],"lick2":["/////.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbbkkbkbkkbbkkk/......kdbbbbtbbbbdk...kkk/....kkkbbbbbbbbbbbkkkkdddk/.......kkkppbbddkk..kdbdbk/.........kpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kbbkbbkbbkk/..........kkkkkkkk","//////.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbbkkbkbkkbbkkk.kkk/......kdbbbbtbbbbdk..kdddk/....kkkbbbbbbbbbbbkkkdbdbk/.......kkkpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kbbkbbkbbkk/..........kkkkkkkk"],"lick3":["//......kkk/.....kpppk/.....kpppk/.....kbbbk.kkk.....kkk/.....kbbbkkpbbkkkkkbbpk/.....kbbbkkppbdbdbdbppk/.....kbbbkkbbbdbbbdbbbk/.....kbbbkkbbbbbbbbbbbk/.....kbbbkkdbbbbbbbbbdk/.....kbbkkkbbkkbkbkkbbkkk/.....kbbbkkdbbbbtbbbbdk/.....kbbkkkbbbbbbbbbbbkkk/.....kbbbbbbbbbbbbbbbbbk...kk/......kkbbbbbbbbbbbbbbbk.kkddk/.......kbbbbbbbbbbbbbbbkkdbbk/.......kbbbbbbbbbbbbbbbbbbkk/.......kbbpppppppppppbbkkk/........kkkkkkkkkkkkkkk","//......kkk/.....kpppk/.....kpppk/.....kbbbk/.....kbbbk.kkk.....kkk/.....kbbbkkpbbkkkkkbbpk/.....kbbbkkppbdbdbdbppk/.....kbbbkkbbbdbbbdbbbk/.....kbbbkkbbbbbbbbbbbk/.....kbbbkkdbbbbbbbbbdk/.....kbbkkkbbkkbkbkkbbkkk/.....kbbbbkdbbbbbbbbbdk/.....kbbkkkbbbbbbbbbbbkkk..kk/......kkbbbbbbbbbbbbbbbk.kkddk/.......kbbbbbbbbbbbbbbbkkdbbk/.......kbbbbbbbbbbbbbbbbbbkk/.......kbbpppppppppppbbkkk/........kkkkkkkkkkkkkkk"]}}};
    /* 垂下來過的訊息（用訊息 id 記）：貓永遠不咬、不吊、不跳上去。
       來源：droop.js 的同步紀錄（Droop.last，資料庫 dr/$msgId，有紀錄＝垂過，包含已經挺回來的）、
       row 上的 data-drooped、以及這次開著時收到的 bub-droop 事件。三個都看，換節點／重畫也認得。 */
    const droopedKeys = new Set();
    function everDrooped(el) {
      const row = el && el.closest ? el.closest(".row") : null;
      if (!row) return false;
      const d = row.dataset || {};
      if (d.drooped === "1" || (d.k && droopedKeys.has(d.k))) return true;
      try { return !!(d.k && Droop.last && Droop.last[d.k]); } catch (_) { return false; }
    }
    const PADT = 0; /* 所有影格都是 32×20，和平常走路、坐著同一個大小 */
    const W = DATA.W, H = DATA.H + PADT;
    const chat = document.getElementById("chat");
    const layer = document.getElementById("cats");
    const inputBar = document.querySelector(".c-input");
    if (!chat || !layer || !inputBar) return;

    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const weighted = (table) => {
      let sum = 0;
      for (const k in table) sum += table[k];
      let r = Math.random() * sum;
      for (const k in table) { r -= table[k]; if (r <= 0 && table[k] > 0) return k; }
      for (const k in table) if (table[k] > 0) return k;
      return Object.keys(table)[0];
    };

    /* ----- 像素圖示（心情泡泡裡的 SVG） ----- */
    const ICONS = {
      heart: { c: "#e2455a", g: [".xx.xx.", "xxxxxxx", "xxxxxxx", ".xxxxx.", "..xxx..", "...x..."] },
      note: { c: "#4f63e8", g: ["...xxxxx", "...xxxxx", "...x...x", "...x...x", ".xxx.xxx", "xxxxxxxx", ".xx..xx."] },
      zzz: { c: "#5c7cfa", g: ["....xxxx", ".......x", "xxx...x.", "..x..x..", ".x..xxxx", "xxx.....", ] },
      sparkle: { c: "#f0a81c", g: ["...x...", "...x...", "..xxx..", "xxxxxxx", "..xxx..", "...x...", "...x..."] },
      fish: { c: "#2f97d4", g: ["....xxxx...", "x..xxxxxxx.", "xxxxxxxx.xx", "xxxxxxxxxxx", "x..xxxxxxx.", "....xxxx..."] },
      question: { c: "#8a5cf0", g: [".xxxx.", "xx..xx", "....xx", "...xx.", "..xx..", "......", "..xx.."] },
      bang: { c: "#e8590c", g: ["xx", "xx", "xx", "xx", "..", "xx"] }
    };
    function iconSVG(name) {
      const ic = ICONS[name];
      const gh = ic.g.length, gw = Math.max(...ic.g.map((r) => r.length));
      const n = Math.max(gw, gh) + 2;
      const ox = (n - gw) / 2, oy = (n - gh) / 2;
      let rects = "";
      ic.g.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === "x") rects += '<rect x="' + (x + ox) + '" y="' + (y + oy) + '" width="1.02" height="1.02"/>';
        }
      });
      return '<svg viewBox="0 0 ' + n + " " + n + '" fill="' + ic.c + '" aria-hidden="true">' + rects + "</svg>";
    }
    const MOOD_ICONS = {
      happy: ["heart", "heart", "sparkle"],
      sleepy: ["zzz"],
      curious: ["question", "question", "bang"],
      hungry: ["fish"],
      playful: ["note", "sparkle", "heart"]
    };
    const PLAY_ICONS = ["note", "sparkle", "heart", "bang", "note"];

    /* ----- 把文字像素格轉成影格 ----- */
    function hexRGB(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
    function buildFrame(str, pal) {
      const rows0 = str.split("/");
      const rows = Array(rows0.length > DATA.H ? Math.max(0, H - rows0.length) : PADT).fill("").concat(rows0);
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const ctx = cv.getContext("2d");
      const img = ctx.createImageData(W, H);
      const mask = new Uint8Array(W * H);
      let top = H, minx = W, maxx = -1;
      for (let y = 0; y < H; y++) {
        const row = rows[y] || "";
        for (let x = 0; x < W; x++) {
          const ch = row[x] || ".";
          if (ch === "." || !pal[ch]) continue;
          const [r, g, b] = pal[ch];
          const i = (y * W + x) * 4;
          img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
          mask[y * W + x] = 1;
          if (y < top) top = y;
          if (x < minx) minx = x;
          if (x > maxx) maxx = x;
        }
      }
      ctx.putImageData(img, 0, 0);
      /* 泡泡錨點：最上面兩列（耳朵）的中心 */
      let sx = 0, n = 0;
      for (let y = top; y < Math.min(H, top + 2); y++) {
        const row = rows[y] || "";
        for (let x = 0; x < W; x++) if (row[x] && row[x] !== ".") { sx += x; n++; }
      }
      /* 嘴巴位置：側臉用鼻子（t）往下一點；正面用臉的中心 */
      let mouth = null;
      for (let y = 0; y < H && !mouth; y++) { const row = rows[y] || ""; const i = row.indexOf("t"); if (i >= 0) mouth = { x: i + 0.3, y: y + 1.6 }; }
      return { cv, mask, top, minx, maxx, cx: n ? sx / n : W / 2, mouth };
    }
    /* 咬泡泡的影格（側面，朝右畫）：0 張嘴、1 咬住、2 甩頭往後拉、3 甩到最後面 */
    const BITE_FRAMES = ["///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kddk.........kbbbbbbbbbwbbkk/kbbk.........kbbbbbbbbbkbbbtk/kddkkkkkkkkkkkbbbbbbbbbbbbktk/.kbbbbdbbdbbdbbbbbbbbbbbbbbwk/..kbbbdbbdbbdbbdbbbbbbbbbkkk/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbppppppbbbbbk/...kbbkkffkkkkkbbkffk/...kbbkkffk...kbbkffk/...kbbkkffk...kbbkffk/....kk..kk.....kk.kk", "///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kddk.........kbbbbbbbbbwbbkk/kbbk.........kbbbbbbbbbkbbbtk/kddkkkkkkkkkkkbbbbbbbbbbbkkwk/.kbbbbdbbdbbdbbbbbbbbbbbbkk/..kbbbdbbdbbdbbdbbbbbbbbbk/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbppppppbbbbbk/...kbbkkffkkkkkbbkffk/...kbbkkffk...kbbkffk/...kbbkkffk...kbbkffk/....kk..kk.....kk.kk", "//...............k.....k/..............kbk...kbk/.............kbpbkkkbpbk/.............kbppbbbppbbk/..kk........kbbbdbdbbbbbbk/.kbbk.......kbbbbbbbbbwbbkk/kddk........kbbbbbbbbbkbbbtk/kbbk........kbbbbbbbbbbbkkwk/kddkkkkkkkkkkbbbbbbbbbbbkk/.kbbbbdbbdbbdbbbbbbbbbbbbk/..kbbbdbbdbbdbbdbbbbbbbbbk/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbppppppbbbbbk/...kbbkkffkkkkkbbkffk/...kbbkkffk....kbbkffk/...kbbkkffk....kbbkffk/....kk..kk......kk.kk", "/..............k.....k/.............kbk...kbk/............kbpbkkkbpbk/............kbppbbbppbbk/...........kbbbdbdbbbbbbk/..kk.......kbbbbbbbbbwbbkk/.kbbk......kbbbbbbbbbkbbbtk/kddk.......kbbbbbbbbbbbkkwk/kbbk.......kbbbbbbbbbbbkk/kddkkkkkkkkkbbbbbbbbbbbbk/.kbbbbdbbdbbdbbbbbbbbbbbbk/..kbbbdbbdbbdbbdbbbbbbbbbk/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbppppppbbbbbk/...kbbkkffkkkkkbbkffk/...kbbkkffk....kbbkffk/...kbbkkffk.....kbbkffk/....kk..kk.......kk.kk"];
    for (const name of Object.keys(DATA.frames)) DATA.frames[name].bite = BITE_FRAMES;
    /* 每張咬泡泡影格的「咬住點」（嘴裡那顆白色小牙的位置） */
    const BITE_PT = BITE_FRAMES.map((str) => {
      const rows = str.split("/");
      let pt = null;
      rows.forEach((row, y) => { for (let x = 24; x < row.length; x++) if (row[x] === "w") pt = { x: x + 0.5, y: y + 0.3 + PADT }; });
      return pt;
    });
    /* 談戀愛的影格（同樣的像素格式；tailHeart 是兩條尾巴繞成的愛心，g/G 灰尾、o/O 棕尾） */
    const LOVE_FRAMES = {"sideSit": "/................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/.............kbbbbbbbbbkbbbtkk/.............kbbbbbbbbbbbbbk/............kbbbbbbbbbbbbkk.kk/...........kbdbbbbbbbbbpk....k/..........kbdbbbbbbbbbppk/.........kbdbbbbbbbbbbppk/........kbbbbbbbbbbbbbppk/........kbbbbbbbbbbbbbbbk/........kbbbbbbbbbbkbbkbk/.kk.....kbbbbbbbbbbkbbkbk/kbbk....kdbbbbbbbbbkbbkbk/.kbbkkkkkbdbbbbbbbbkffkfk/..kkkkkkkkkkkkkkkkkkkkkkk", "sideSitHappy": "/................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbkbbkk..k/.............kbbbbbbbbkbkbbtkk/.............kbbbbbbbbbbbbbk/............kbbbbbbbbbbbbkk.kk/...........kbdbbbbbbbbbpk....k/..........kbdbbbbbbbbbppk/.........kbdbbbbbbbbbbppk/........kbbbbbbbbbbbbbppk/........kbbbbbbbbbbbbbbbk/........kbbbbbbbbbbkbbkbk/.kk.....kbbbbbbbbbbkbbkbk/kbbk....kdbbbbbbbbbkbbkbk/.kbbkkkkkbdbbbbbbbbkffkfk/..kkkkkkkkkkkkkkkkkkkkkkk", "sideSitLick": "/................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbkbbkk..k/.............kbbbbbbbbkbkbbtkt/.............kbbbbbbbbbbbbbtt/............kbbbbbbbbbbbbkk.kk/...........kbdbbbbbbbbbpk....k/..........kbdbbbbbbbbbppk/.........kbdbbbbbbbbbbppk/........kbbbbbbbbbbbbbppk/........kbbbbbbbbbbbbbbbk/........kbbbbbbbbbbkbbkbk/.kk.....kbbbbbbbbbbkbbkbk/kbbk....kdbbbbbbbbbkbbkbk/.kbbkkkkkbdbbbbbbbbkffkfk/..kkkkkkkkkkkkkkkkkkkkkkk", "nuzzle": "////................k.....k/...............kbk...kbk/..kk..........kbpbkkkbpbk/.kbbk.........kbppbbbppbbk/kddk.........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbkbbkk..k/kddkkkkkkkkkkkbbbbbbbbkbkbbtkk/.kbbbbdbbdbbdkbbbbbbbbbbbbbkkk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbppppppbbbbbk/...kbbkkffkkkkkbbkffk/...kbbkkffk...kbbkffk/...kbbkkffk...kbbkffk/....kk..kk.....kk.kk", "walkEager": "///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kddk.........kbbbbbbbbbwbbkk..k/kbbk.........kbbbbbbbbbkbbbtkk/kddkkkkkkkkkkkbbbbbbbbbbbbbk/.kbbbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbppppppbbbbbk/...kbbkkffkkkkkbbkffk/...kbbkkffk...kbbkffk/...kbbkkffk...kbbkffk/....kk..kk.....kk.kk", "sitHappyNoTail": "///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbkbbbkbbdk/....kkkbbkbktkbkbbk/......kdbbbbbbbbbdk/....kkkbbbbbbbbbbbk/.......kkbbbbbbbkk/.........kbbbbbk/.........kppbbddk/.........kpppbbddk/.........kppppbbddk/.........kppppbbbbk/.........kddkbbkbbk/..........kkkkkkkk", "sideSitLickTall": "/................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbkbbkk..k/.............kbbbbbbbbkbkbbtkk/.............kbbbbbbbbbbbbkttk/............kbbbbbbbbbbbbkktttk/...........kbdbbbbbbbbbpk..ktkk/..........kbdbbbbbbbbbppk...kk/.........kbdbbbbbbbbbbppk/........kbbbbbbbbbbbbbppk/........kbbbbbbbbbbbbbppk/........kbbbbbbbbbbbbbppk/........kbbbbbbbbbbbbbppk/........kbbbbbbbbbbbbbppk/........kbbbbbbbbbbbbbbbk/........kbbbbbbbbbbkbbkbk/.kk.....kbbbbbbbbbbkbbkbk/kbbk....kdbbbbbbbbbkbbkbk/.kbbkkkkkbdbbbbbbbbkffkfk/..kkkkkkkkkkkkkkkkkkkkkkk", "sideSitBow": "////................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/............kkbbbbbbbbbkbbkk..k/...........kbkbbbbbbbbkbkbbtkk/..........kbdkbbbbbbbbbbbbbk/.........kbdbbbbbbbbbbppk/........kbbbbbbbbbbbbbppk/........kbbbbbbbbbbbbbbbk/........kbbbbbbbbbbkbbkbk/.kk.....kbbbbbbbbbbkbbkbk/kbbk....kdbbbbbbbbbkbbkbk/.kbbkkkkkbdbbbbbbbbkffkfk/..kkkkkkkkkkkkkkkkkkkkkkk", "sideSitTall": "/................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbkbbkk..k/.............kbbbbbbbbkbkbbtkk/.............kbbbbbbbbbbbbbk/............kbbbbbbbbbbbbkk.kk/...........kbdbbbbbbbbbpk....k/..........kbdbbbbbbbbbppk/.........kbdbbbbbbbbbbppk/........kbbbbbbbbbbbbbppk/........kbbbbbbbbbbbbbppk/........kbbbbbbbbbbbbbppk/........kbbbbbbbbbbbbbppk/........kbbbbbbbbbbbbbppk/........kbbbbbbbbbbbbbbbk/........kbbbbbbbbbbkbbkbk/.kk.....kbbbbbbbbbbkbbkbk/kbbk....kdbbbbbbbbbkbbkbk/.kbbkkkkkbdbbbbbbbbkffkfk/..kkkkkkkkkkkkkkkkkkkkkkk", "walkEagerHappy": "///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kddk.........kbbbbbbbbbkbbkk..k/kbbk.........kbbbbbbbbkbkbbtkk/kddkkkkkkkkkkkbbbbbbbbbbbbbk/.kbbbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbppppppbbbbbk/...kbbkkffkkkkkbbkffk/...kbbkkffk...kbbkffk/...kbbkkffk...kbbkffk/....kk..kk.....kk.kk", "tailHeart": "..........kkkkk....kkkkk/.........kgGgggk..kOoooOk/........kgGgggGgkkOoooOook/.......kgGgkkkgggkookkkooOk/.......kGgk...kgGkok...kOok/.......kggk....kk.k....kook/.......kggGk..........koook/........kGggk........koook/........kgggGk......koooOk/.........kkGggk....koookk/...........kggGk..koook/............kGggkkoook/.............kggGoook/..............kGgook/..............kggoOk/...............kgOk/kkkkkkkkkkkkkkkkgokkkkkkkkkkkkkkkk/gggGgggGgggGgggGgkoOoooOoooOoooOoo/ggGgggGgggGgggGggkOoooOoooOoooOooo/kkkkkkkkkkkkkkkkk.kkkkkkkkkkkkkkkk/"};
    /* 側坐影格修正：和平常坐著／走路一樣高（耳朵在第 3 列），不會看起來比較大隻 */
    Object.assign(LOVE_FRAMES, {"sideSit": "///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/.............kbbbbbbbbbkbbbtkk/.............kbbbbbbbbbbbbbk/............kbbbbbbbbbbbbkk.kk/...........kbdbbbbbbbbbpk....k/..........kbdbbbbbbbbbppk/.........kbdbbbbbbbbbbppk/........kbbbbbbbbbbkbbkbk/.kk.....kbbbbbbbbbbkbbkbk/kbbk....kdbbbbbbbbbkbbkbk/.kbbkkkkkbdbbbbbbbbkffkfk/..kkkkkkkkkkkkkkkkkkkkkkk", "sideSitHappy": "///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbkbbkk..k/.............kbbbbbbbbkbkbbtkk/.............kbbbbbbbbbbbbbk/............kbbbbbbbbbbbbkk.kk/...........kbdbbbbbbbbbpk....k/..........kbdbbbbbbbbbppk/.........kbdbbbbbbbbbbppk/........kbbbbbbbbbbkbbkbk/.kk.....kbbbbbbbbbbkbbkbk/kbbk....kdbbbbbbbbbkbbkbk/.kbbkkkkkbdbbbbbbbbkffkfk/..kkkkkkkkkkkkkkkkkkkkkkk", "sideSitLick": "///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbkbbkk..k/.............kbbbbbbbbkbkbbtkt/.............kbbbbbbbbbbbbbtt/............kbbbbbbbbbbbbkk.kk/...........kbdbbbbbbbbbpk....k/..........kbdbbbbbbbbbppk/.........kbdbbbbbbbbbbppk/........kbbbbbbbbbbkbbkbk/.kk.....kbbbbbbbbbbkbbkbk/kbbk....kdbbbbbbbbbkbbkbk/.kbbkkkkkbdbbbbbbbbkffkfk/..kkkkkkkkkkkkkkkkkkkkkkk", "sideSitTall": "///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbkbbkk..k/.............kbbbbbbbbkbkbbtkk/.............kbbbbbbbbbbbbbk/............kbbbbbbbbbbbbkk.kk/...........kbdbbbbbbbbbpk....k/..........kbdbbbbbbbbbppk/.........kbdbbbbbbbbbbppk/........kbbbbbbbbbbkbbkbk/.kk.....kbbbbbbbbbbkbbkbk/kbbk....kdbbbbbbbbbkbbkbk/.kbbkkkkkbdbbbbbbbbkffkfk/..kkkkkkkkkkkkkkkkkkkkkkk", "sideSitLickTall": "///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbkbbkk..k/.............kbbbbbbbbkbkbbtkk/.............kbbbbbbbbbbbbkttk/............kbbbbbbbbbbbbkktttk/...........kbdbbbbbbbbbpk..ktkk/..........kbdbbbbbbbbbppk...kk/.........kbdbbbbbbbbbbppk/........kbbbbbbbbbbkbbkbk/.kk.....kbbbbbbbbbbkbbkbk/kbbk....kdbbbbbbbbbkbbkbk/.kbbkkkkkbdbbbbbbbbkffkfk/..kkkkkkkkkkkkkkkkkkkkkkk", "sideSitBow": "//////................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/............kkbbbbbbbbbkbbkk..k/...........kbkbbbbbbbbkbkbbtkk/..........kbdkbbbbbbbbbbbbbk/.........kbdbbbbbbbbbbppk/........kbbbbbbbbbbkbbkbk/.kk.....kbbbbbbbbbbkbbkbk/kbbk....kdbbbbbbbbbkbbkbk/.kbbkkkkkbdbbbbbbbbkffkfk/..kkkkkkkkkkkkkkkkkkkkkkk"});
    const LOVE_KEYS = {"stand": "walkEager", "side": "sideSit", "sideHappy": "sideSitHappy", "nuzzle": "nuzzle", "nuzzle2": "walkEagerHappy", "tall": "sideSitTall", "lick": "sideSitLickTall", "bow": "sideSitBow", "front": "sitHappyNoTail"};
    const LOVE_TAIL_W = 34, LOVE_TAIL_H = 21;
    for (const name of Object.keys(DATA.frames)) DATA.frames[name].love = Object.values(LOVE_KEYS).map((k) => LOVE_FRAMES[k]);
    const SPRITES = {};
    for (const name of Object.keys(DATA.frames)) {
      const pal = {};
      for (const k in DATA.pal[name]) pal[k] = hexRGB(DATA.pal[name][k]);
      SPRITES[name] = {};
      for (const anim of Object.keys(DATA.frames[name])) {
        SPRITES[name][anim] = DATA.frames[name][anim].map((s, i) => {
          const f = buildFrame(s === "=" ? DATA.frames.gray[anim][i] : s, pal);
          if (anim === "lick3") f.cx = 16; /* 抬腿舔毛時，泡泡對準頭不是腳 */
          f.side = anim === "walk" || anim === "run" || anim === "jump" || anim === "bite";
          if (anim === "love") f.side = !/^sitHappyNoTail$/.test(Object.values(LOVE_KEYS)[i]);
          if (anim === "bite") { f.bitePt = BITE_PT[i]; f.mouth = { x: BITE_PT[i].x, y: BITE_PT[i].y + 0.5 }; }
          if (!f.side || !f.mouth) f.mouth = { x: f.cx + 0.5, y: f.top + 7.5 };
          return f;
        });
      }
    }

    /* 吊在泡泡上的影格：側面跑步影格改成咬住的嘴，執行時轉 90°（頭朝上、四隻腳往下亂踢） */
    const HANG_FRAMES = ["//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk/kkk..........kbbbbbbbbbkbbbtk/bbdkkkkkkkkkkkbbbbbbbbbbbkkwk/kkbbdbdbbdbbdbbbbbbbbbbbbkk/..kkbbdbbdbbdbbdbbbbbbbbbk/...kbbbbbbbbbbbbbbbbbbkkk/...kbbbbbppppppppppbbbk/..kffbbkkkkkkkkkkkkbbffk/..kfbbk............kbbfk/.kfbbk..............kbbfk/.kbbk................kbbk/..kk..................kk", "////................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk/kkk..........kbbbbbbbbbkbbbtk/bbdkkkkkkkkkkkbbbbbbbbbbbkkwk/kkbbdbbdbbdbbdbbbbbbbbbbbkk/..kkbbbdbbdbbdbbbbbbbbbbbk/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kkkkbbfffbbkkkkk/........kbbfffbbk/.......kbbffffkbbk/........kkkkkk.kk", "///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk/kkk..........kbbbbbbbbbkbbbtk/bbdkkkkkkkkkkkbbbbbbbbbbbkkwk/kkbbdbbdbbdbbdbbbbbbbbbbbkk/..kkbbbdbbdbbdbbbbbbbbbbbk/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kkbbkffkkffkbbkk/......kbbkffkkffkbbk/......kbbkffkkffkbbk/.......kbbkffffkbbk/........kk.kkkk.kk", "///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk/kkk..........kbbbbbbbbbkbbbtk/bbdkkkkkkkkkkkbbbbbbbbbbbkkwk/kkbbdbbdbbdbbdbbbbbbbbbbbkk/..kkbbbdbbdbbdbbbbbbbbbbbk/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kfbbkkkkkkkbbfkk/.....kfbbk.....kbbfk/.....kfbbk.....kbbfk/....kfbbk.......kbbfk/.....kkk.........kkk"];
    const SIDE_I = Object.keys(LOVE_KEYS).indexOf("side"), SIDE_HAPPY_I = Object.keys(LOVE_KEYS).indexOf("sideHappy");
    for (const name of Object.keys(SPRITES)) {
      const pal = {};
      for (const k in DATA.pal[name]) pal[k] = hexRGB(DATA.pal[name][k]);
      SPRITES[name].hang = HANG_FRAMES.map((str) => {
        const src = buildFrame(str, pal);
        const cv = document.createElement("canvas");
        cv.width = 20; cv.height = 32;
        const c = cv.getContext("2d");
        c.imageSmoothingEnabled = false;
        c.translate(0, 32); c.rotate(-Math.PI / 2);
        c.drawImage(src.cv, 0, 0);
        c.setTransform(1, 0, 0, 1, 0, 0);
        const d = c.getImageData(0, 0, 20, 32).data;
        const mask = new Uint8Array(20 * 32);
        for (let i = 0; i < mask.length; i++) mask[i] = d[i * 4 + 3] > 128 ? 1 : 0;
        /* 咬住點：嘴裡那顆白色小牙 */
        let pt = { x: 9.5, y: 4.4 };
        str.split("/").forEach((row, y) => { for (let x = 24; x < row.length; x++) if (row[x] === "w") pt = { x: y + 0.5, y: 31 - x + 1.2 }; });
        return { cv, mask, pt, top: 0, cx: 10, side: false, mouth: { x: pt.x, y: pt.y } };
      });
      for (const f of SPRITES[name].walk.concat(SPRITES[name].run)) f.stand = true;
    }

    /* ----- 打架煙霧團（卡通「一團煙」，只露出爪子、腳、尾巴） ----- */
    const FW = 56, FH = 34;
    const FPAL = {
      k: hexRGB("#010101"), c: hexRGB("#f4f1ec"), e: hexRGB("#cfc7be"), y: hexRGB("#f6c544"),
      g: hexRGB(DATA.pal.gray.b), G: hexRGB(DATA.pal.gray.d), P: hexRGB(DATA.pal.gray.p),
      o: hexRGB(DATA.pal.brown.b), O: hexRGB(DATA.pal.brown.d), Q: hexRGB(DATA.pal.brown.p)
    };
    const LIMB_COL = { gray: ["g", "G", "P"], brown: ["o", "O", "Q"] };
    const fightEl = document.createElement("div");
    fightEl.className = "cat-fight";
    const fightShadow = document.createElement("div");
    fightShadow.className = "cat-shadow";
    const fightCv = document.createElement("canvas");
    fightCv.width = FW; fightCv.height = FH;
    fightEl.appendChild(fightShadow);
    fightEl.appendChild(fightCv);
    fightEl.style.display = "none";
    layer.appendChild(fightEl);
    const fctx = fightCv.getContext("2d");
    const fimg = fctx.createImageData(FW, FH);

    function outlineGrid(g) {
      const add = [];
      for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
        if (g[y * FW + x]) continue;
        if ((x > 0 && g[y * FW + x - 1] && g[y * FW + x - 1] !== "k") ||
            (x < FW - 1 && g[y * FW + x + 1] && g[y * FW + x + 1] !== "k") ||
            (y > 0 && g[(y - 1) * FW + x] && g[(y - 1) * FW + x] !== "k") ||
            (y < FH - 1 && g[(y + 1) * FW + x] && g[(y + 1) * FW + x] !== "k")) add.push(y * FW + x);
      }
      for (const i of add) g[i] = "k";
    }
    function plot(g, x, y, c) {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && x < FW && y >= 0 && y < FH - 1) g[y * FW + x] = c;
    }
    function newLimb(now) {
      const kind = weighted({ paw: 5, foot: 3, tail: 2 });
      /* 只往上、往左右伸出來，不會伸到地板下面 */
      let ang = kind === "foot" ? (Math.random() < 0.5 ? rand(-0.15, 0.35) : Math.PI - rand(-0.15, 0.35)) : rand(-Math.PI + 0.1, -0.1);
      return { kind, ang, cat: Math.random() < 0.5 ? "gray" : "brown", t0: now, life: rand(160, 340), len: kind === "tail" ? rand(8, 12) : rand(5, 8) };
    }
    function drawFight(now) {
      const fs = soc.fight;
      const t = now - fs.t0;
      while (fs.limbs.length < 3 || (fs.limbs.length < 5 && Math.random() < 0.08)) fs.limbs.push(newLimb(now + rand(0, 120)));
      fs.limbs = fs.limbs.filter((l) => now - l.t0 < l.life);
      const cx = FW / 2 + Math.round(Math.sin(t / 37) * 1.2), cy = FH - 11 - (Math.round(t / 70) % 2);
      const R = 9;
      /* 1) 先畫爪子／腳／尾巴（從煙裡伸出來再縮回去） */
      const L = new Array(FW * FH).fill(0);
      for (const l of fs.limbs) {
        const p = (now - l.t0) / l.life;
        if (p < 0) continue;
        const out = Math.sin(clamp(p, 0, 1) * Math.PI);
        /* 煙團邊緣（橢圓）在這個角度的距離，爪子從邊緣再往外伸 */
        const ca = Math.cos(l.ang), sa = Math.sin(l.ang);
        const edge = 1 / Math.sqrt((ca * ca) / (15.5 * 15.5) + (sa * sa) / (11.5 * 11.5));
        const len = edge - 1 + l.len * out;
        const [cb, cd, cp] = LIMB_COL[l.cat];
        let a = l.ang;
        for (let s = edge * 0.55; s <= len; s += 0.5) {
          if (l.kind === "tail") a = l.ang + Math.sin(t / 70 + s * 0.35) * 0.25;
          const x = cx + Math.cos(a) * s, y = cy + Math.sin(a) * s;
          let col = cb;
          if (l.kind === "tail" && Math.floor(s) % 3 === 2) col = cd;
          const tip = s > len - 2 && l.kind !== "tail";
          if (tip && l.kind === "paw") col = cp;
          /* 兩格粗，粗粗的像素腳 */
          const nx = -Math.sin(a), ny = Math.cos(a);
          plot(L, x, y, col);
          plot(L, x + nx, y + ny, col);
          if (tip) { plot(L, x - nx, y - ny, col); }
        }
      }
      outlineGrid(L);
      /* 2) 再畫煙霧團：幾顆圓滾滾的煙球繞著中心轉，看起來在翻滾 */
      const C = new Array(FW * FH).fill(0);
      const puffs = [{ x: cx, y: cy, rx: R + 2, ry: R - 2 }];
      const n = 7, spin = t / 210;
      for (let i = 0; i < n; i++) {
        const a = spin + i * Math.PI * 2 / n + Math.sin(t / 90 + i) * 0.15;
        const r = 4 + ((i + Math.floor(t / 110)) % 3) * 0.8;
        puffs.push({ x: cx + Math.cos(a) * (R + 1.5), y: cy + Math.sin(a) * (R - 2.5), rx: r, ry: r * 0.9 });
      }
      for (const p of puffs) {
        for (let y = Math.floor(p.y - p.ry); y <= Math.ceil(p.y + p.ry); y++) {
          for (let x = Math.floor(p.x - p.rx); x <= Math.ceil(p.x + p.rx); x++) {
            const dx = (x - p.x) / p.rx, dy = (y - p.y) / p.ry;
            const d = dx * dx + dy * dy;
            if (d <= 1 && y < FH - 1 && x >= 0 && x < FW && y >= 0) {
              const shade = dy > 0.35 || (dx > 0.55 && dy > 0) ;
              const cur = C[y * FW + x];
              C[y * FW + x] = shade && cur !== "c" ? "e" : "c";
            }
          }
        }
      }
      outlineGrid(C);
      /* 煙團上的小捲捲線 */
      for (let i = 0; i < 3; i++) {
        const a = -spin * 1.3 + i * 2.1;
        const x = Math.round(cx + Math.cos(a) * 5), y = Math.round(cy + Math.sin(a) * 3);
        if (C[y * FW + x] === "c") { C[y * FW + x] = "e"; if (C[y * FW + x + 1] === "c") C[y * FW + x + 1] = "e"; }
      }
      /* 3) 合成，再撒兩顆星星 */
      const G2 = L.map((v, i) => C[i] || v);
      if (Math.floor(t / 140) % 3 !== 0) {
        for (let i = 0; i < 2; i++) {
          const a = t / 300 + i * Math.PI;
          const sx = Math.round(cx + Math.cos(a) * 17), sy = Math.round(cy - 8 + Math.sin(a) * 4);
          for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const X = sx + dx, Y = sy + dy;
            if (X >= 0 && X < FW && Y >= 0 && Y < FH - 1 && !G2[Y * FW + X]) G2[Y * FW + X] = "y";
          }
        }
      }
      const d = fimg.data;
      for (let i = 0; i < FW * FH; i++) {
        const c = G2[i];
        if (!c) { d[i * 4 + 3] = 0; continue; }
        const [r, g, b] = FPAL[c];
        d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
      }
      fctx.putImageData(fimg, 0, 0);
      const drift = Math.sin(t / 420) * 10 + Math.sin(t / 53) * 1.5;
      const x = Math.round(clamp(fs.cx + drift - FW * S / 2, -FW * S * 0.15, areaW - FW * S * 0.85));
      fightEl.style.transform = "translate3d(" + x + "px," + (-(Math.round(t / 90) % 2)) + "px,0)";
      fs.drawnX = x;
    }

    /* ----- 尺寸：手機上 3 倍、很窄時 2 倍（整數放大，邊緣銳利） ----- */
    let S = 2.55, areaW = 360, floorPx = 60, floorY = 500, topY = 54;
    let spawned = false;
    function chatLive() { return !chat.hidden && chat.clientWidth >= 20; }
    function measure() {
      if (!chatLive()) return;
      areaW = chat.clientWidth;
      /* 比原本小 15%（3 倍 → 2.55 倍；很窄時 2 倍 → 1.7 倍） */
      S = (areaW >= 360 ? 3 : 2) * 0.85;
      /* 貓的地板＝輸入框上緣再往上 1px，腳和泡泡永遠不會被輸入框蓋住 */
      const floor = Math.ceil(chat.getBoundingClientRect().bottom - inputBar.getBoundingClientRect().top) + 1;
      floorPx = floor;
      chat.style.setProperty("--cat-floor", floor + "px");
      /* 底部只留一點空間：訊息一多，最下面的泡泡會蓋在貓前面（貓從泡泡後面走過） */
      chat.style.setProperty("--cat-walk", Math.round(4 * S) + "px");
      geom();
      sizeShade();
      if (typeof ball !== "undefined") { ball.x = clamp(ball.x, BR, areaW - BR); ball.y = clamp(ball.y, topY + BR, floorY - BR); }
      for (const c of cats) {
        c.el.style.width = W * S + "px";
        c.el.style.height = H * S + "px";
        c.body.style.width = W * S + "px";
        c.body.style.height = H * S + "px";
        c.shadow.style.width = 18 * S + "px";
        c.x = clamp(c.x, Math.min(minX(), wallX(-1)), Math.max(maxX(), wallX(1)));
        c.cur = null;
      }
      fightEl.style.width = FW * S + "px";
      fightEl.style.height = FH * S + "px";
      fightCv.style.width = FW * S + "px";
      fightCv.style.height = FH * S + "px";
      fightShadow.style.left = 15 * S + "px";
      fightShadow.style.width = 26 * S + "px";
      if (!spawned && cats.length === 2 && maxX() > 8) {
        cats[0].x = maxX() * 0.18;
        cats[1].x = maxX() * 0.78;
        spawned = true;
      }
    }
    const minX = () => 0;
    const maxX = () => Math.max(0, areaW - W * S);
    const GAP = () => W * S * 0.78;
    function wallX(side) {
      /* 抓牆時讓前爪剛好碰到聊天室左右邊 */
      const f = SPRITES.gray.scratch[0];
      return side > 0 ? areaW - (f.maxx + 1) * S : -(W - 1 - f.maxx) * S;
    }


    /* =====================================================================
       螢光黃彈力球：可以拖曳亂丟；會撞泡泡（橢圓）、牆壁、地板反彈
       貓會追、叼著到處走，另一隻會來搶；搶不過就打架，球從煙霧裡彈出來
       ===================================================================== */
    const msgList = document.getElementById("msgList");
    const scrollEl = document.getElementById("scroller");
    const BR = 7;
    const ballShadow = document.createElement("div");
    ballShadow.className = "ball-shadow";
    const ballEl = document.createElement("div");
    ballEl.className = "ball";
    const ballSeam = document.createElement("i");
    ballEl.appendChild(ballSeam);
    layer.appendChild(ballShadow);
    layer.appendChild(ballEl);
    const ball = { x: 0, y: 0, vx: 0, vy: 0, state: "loose", carrier: null, dragId: null, samples: [], squashAt: -1e9, spin: 0, stillSince: 0, lastPoke: 0, init: false };
    let lastFightAt = -1e9;
    const FIGHT_COOLDOWN = 45000;
    function fightOK(now) { return now - lastFightAt > FIGHT_COOLDOWN; }
    let chatR = null;
    function geom() {
      chatR = chat.getBoundingClientRect();
      const sr = scrollEl.getBoundingClientRect();
      floorY = chatR.height - floorPx;
      topY = sr.top - chatR.top;
    }
    function sizeShade() {}
    function radiiFor(el) {
      const cs = getComputedStyle(el);
      const n = (v) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
      return {
        tl: n(cs.borderTopLeftRadius),
        tr: n(cs.borderTopRightRadius),
        br: n(cs.borderBottomRightRadius),
        bl: n(cs.borderBottomLeftRadius),
      };
    }
    function bubblePath(ctx, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(r.tl, 0);
      ctx.lineTo(w - r.tr, 0);
      ctx.quadraticCurveTo(w, 0, w, r.tr);
      ctx.lineTo(w, h - r.br);
      ctx.quadraticCurveTo(w, h, w - r.br, h);
      ctx.lineTo(r.bl, h);
      ctx.quadraticCurveTo(0, h, 0, h - r.bl);
      ctx.lineTo(0, r.tl);
      ctx.quadraticCurveTo(0, 0, r.tl, 0);
      ctx.closePath();
    }
    /* 被咬著拉的泡泡：拿掉暫時的變形，量原本的位置和大小 */
    function layoutRect(b) {
      const t = b.style.transform;
      if (t) b.style.transform = "none";
      const r = b.getBoundingClientRect();
      if (t) b.style.transform = t;
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }
    /* 目前畫面上看得到的訊息泡泡（原本的圓角矩形） */
    function bubbleShapes() {
      const sr = scrollEl.getBoundingClientRect();
      const out = [];
      for (const b of msgList.querySelectorAll(".row:not(.shattering):not(.gone) .bub:not(.ghost):not(.droop)")) {
        const r = b._jelly ? layoutRect(b) : b.getBoundingClientRect();
        if (r.bottom < sr.top || r.top > sr.bottom || r.width < 4) continue;
        const x = r.left - chatR.left, y = r.top - chatR.top;
        out.push({ el: b, x, y, w: r.width, h: r.height, cx: x + r.width / 2, cy: y + r.height / 2, r: radiiFor(b) });
      }
      out.clip = { x: sr.left - chatR.left, y: sr.top - chatR.top, w: sr.width, h: sr.height };
      return out;
    }

    /* ----- 物理 ----- */
    const MAXV = 1500;
    function bounced(now, v) {
      if (v > 160) ball.squashAt = now;
      /* 球彈到附近，沒在玩的貓偶爾會被吸引過來 */
      if (v < 260 || now - ball.lastPoke < 1500) return;
      ball.lastPoke = now;
      for (const c of cats) {
        if (c.hidden || inSoc(c) || wants(c, now) || (c.act && (c.act.type === "sleep" || c.act.tapped))) continue;
        if (Math.abs(c.x + W * S / 2 - ball.x) < 110 && Math.random() < 0.2) { c.ballUntil = now + rand(5000, 11000); say(c, "bang", now, 0.6); }
      }
    }
    function collideRoundRect(s, now) {
      const px = ball.x, py = ball.y, x = s.x, y = s.y, w = s.w, h = s.h, rr = s.r;
      const rad = (px < x + w / 2) ? (py < y + h / 2 ? rr.tl : rr.bl) : (py < y + h / 2 ? rr.tr : rr.br);
      const cx = x + w / 2, cy = y + h / 2;
      const hw = w / 2 - rad, hh = h / 2 - rad;
      const dx = Math.abs(px - cx) - hw, dy = Math.abs(py - cy) - hh;
      const ax = Math.max(dx, 0), ay = Math.max(dy, 0);
      const sd = Math.min(Math.max(dx, dy), 0) + Math.hypot(ax, ay) - rad;
      if (sd >= BR) return;
      const sx = px < cx ? -1 : 1, sy = py < cy ? -1 : 1;
      let nx, ny;
      if (dx > 0 && dy > 0) {
        const l = Math.hypot(dx, dy) || 1;
        nx = sx * dx / l; ny = sy * dy / l;
      } else if (dx > dy) { nx = sx; ny = 0; }
      else { nx = 0; ny = sy; }
      const pen = BR - sd;
      ball.x += nx * pen; ball.y += ny * pen;
      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) {
        const e = -vn > 120 ? 0.8 : 0.3;
        ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny;
        ball.vx *= 0.98; ball.vy *= 0.98;
        bounced(now, -vn);
      }
    }
    function ballPhysics(dt, now, shapes) {
      if (!ball.init) { ball.init = true; ball.x = areaW * 0.5; ball.y = topY + 30; ball.vx = rand(-120, 120); ball.vy = 0; }
      if (ball.state !== "loose") return;
      const sp = Math.hypot(ball.vx, ball.vy);
      if (sp > MAXV) { ball.vx *= MAXV / sp; ball.vy *= MAXV / sp; }
      const steps = Math.max(1, Math.min(16, Math.ceil(sp * dt / (BR * 0.6))));
      const h = dt / steps;
      const L = BR, R = areaW - BR;
      for (let i = 0; i < steps; i++) {
        const T = topY + BR, F = floorY - BR;
        ball.vy += 1500 * h;
        ball.x += ball.vx * h; ball.y += ball.vy * h;
        if (ball.x < L) { ball.x = L; if (ball.vx < 0) { ball.vx = -ball.vx * 0.8; bounced(now, ball.vx); } }
        if (ball.x > R) { ball.x = R; if (ball.vx > 0) { ball.vx = -ball.vx * 0.8; bounced(now, -ball.vx); } }
        if (ball.y < T) { ball.y = T; if (ball.vy < 0) { ball.vy = -ball.vy * 0.75; bounced(now, ball.vy); } }
        if (ball.y > F) {
          ball.y = F;
          if (ball.vy > 0) { const v = ball.vy; ball.vy = v > 90 ? -v * 0.72 : 0; ball.vx *= 0.93; if (v > 90) bounced(now, v); }
        }
        for (const s of shapes) collideRoundRect(s, now);
        collideHeads(now);
      }
      const onFloor = ball.y >= floorY - BR - 0.5;
      if (onFloor && Math.abs(ball.vy) < 1) { ball.vx *= Math.pow(0.4, dt); if (Math.abs(ball.vx) < 3) ball.vx = 0; }
      ball.spin += ball.vx * dt / BR;
      /* 卡在泡泡頂端不動時，輕輕推一下讓它滾下來 */
      if (Math.hypot(ball.vx, ball.vy) < 6 && !onFloor) {
        if (!ball.stillSince) ball.stillSince = now;
        else if (now - ball.stillSince > 700) { ball.vx = pick([-1, 1]) * rand(30, 60); ball.stillSince = 0; }
      } else ball.stillSince = 0;
    }

    /* ----- 嘴巴位置（叼球） ----- */
    function mouthPos(cat) {
      const f = cat.cur || SPRITES[cat.name].sit[0];
      const m = f.mouth;
      const mx = cat.dir < 0 ? W - m.x : m.x;
      return { x: cat.x + mx * S + (f.side ? cat.dir * BR * 0.3 : 0), y: floorY - cat.y - (H - m.y) * S + BR * 0.5 };
    }
    function parkBall() {
      const host = ball.state === "carried" && ball.carrier ? ball.carrier.el : layer;
      if (ballEl.parentNode !== host) host.appendChild(ballEl);
      ballEl.style.zIndex = host === layer ? "5" : "";
    }
    function renderBall(now) {
      if (ball.state === "hidden") { ballEl.style.display = "none"; ballShadow.style.display = "none"; return; }
      ballEl.style.display = ""; ballShadow.style.display = "";
      /* 叼著的球跟叼牠的貓在同一層：在牠頭上、但在前面那隻貓後面（貓是 1 或 3，球就是 2 或 4） */
      const carrier = ball.state === "carried" ? ball.carrier : null;
      if (carrier) {
        const p = mouthPos(carrier);
        ball.x = p.x; ball.y = p.y; ball.vx = 0; ball.vy = 0;
      }
      parkBall();
      const sq = now - ball.squashAt < 90 ? "scale(1.18,0.82)" : "";
      let tx = ball.x - BR, ty = ball.y - floorY - BR;
      if (carrier && ballEl.parentNode === carrier.el) { tx -= carrier.x; ty += H * S; }
      ballEl.style.transform = "translate3d(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px,0) " + sq;
      ballSeam.style.transform = "rotate(" + (ball.spin * 57.3).toFixed(0) + "deg) scaleX(.45)";
      const hgt = Math.max(0, floorY - BR - ball.y);
      const k = clamp(1 - hgt / 220, 0.25, 1);
      ballShadow.style.transform = "translate3d(" + (ball.x - BR).toFixed(1) + "px,0,0) scale(" + k.toFixed(2) + ")";
      ballShadow.style.opacity = ball.state === "carried" ? "0" : String(k);
    }

    /* ----- 拖曳、丟球 ----- */
    function ballHit(cx, cy) {
      if (ball.state === "hidden" || !chatR) return false;
      const x = cx - chatR.left, y = cy - chatR.top;
      const d = Math.hypot(x - ball.x, y - ball.y);
      /* 球被叼到泡泡後面時，點到的是泡泡（長按選單照常）；平常球的可點範圍只比球大一圈 */
      if (underBubble(cx, cy)) return false;
      return d < BR + 12;
    }
    function grabBall(e, now) {
      if (soc && soc.kind === "love") endSoc(now); /* 摸球：談戀愛中斷 */
      const c = ball.carrier;
      if (c) {
        ball.carrier = null;
        if (!c.hidden) { setAct(c, { type: "stun", dur: rand(500, 900) }, now); say(c, "question", now, 0.8); }
      }
      ball.state = "drag";
      ball.dragId = e.pointerId;
      ball.vx = ball.vy = 0;
      ball.samples = [];
      document.documentElement.classList.add("room-pet-drag");
      dragBall(e, now);
    }
    function dragBall(e, now) {
      ball.x = clamp(e.clientX - chatR.left, BR, areaW - BR);
      ball.y = clamp(e.clientY - chatR.top, topY + BR, floorY - BR);
      ball.samples.push({ t: now, x: ball.x, y: ball.y });
      while (ball.samples.length > 2 && now - ball.samples[0].t > 90) ball.samples.shift();
    }
    function releaseBall(e, now, cancel) {
      if (!cancel) dragBall(e, now);
      const s = ball.samples;
      let vx = 0, vy = 0;
      if (s.length >= 2) {
        const a = s[0], b = s[s.length - 1];
        const t = Math.max(16, b.t - a.t) / 1000;
        vx = (b.x - a.x) / t; vy = (b.y - a.y) / t;
      }
      const sp = Math.hypot(vx, vy);
      if (sp > MAXV) { vx *= MAXV / sp; vy *= MAXV / sp; }
      ball.vx = vx; ball.vy = vy;
      ball.state = "loose";
      ball.dragId = null;
      document.documentElement.classList.remove("room-pet-drag");
      onThrow(now);
    }
    window.addEventListener("touchmove", (e) => { if (ball.state === "drag") e.preventDefault(); }, { passive: false });
    function onThrow(now) {
      /* 球被丟出去：大部分時候貓會想去追（睡著的比較不理） */
      for (const c of cats) {
        if (c.hidden) continue;
        const sleeping = c.act && c.act.type === "sleep";
        if (wants(c, now) || Math.random() < (sleeping ? 0.35 : 0.8)) {
          c.ballUntil = Math.max(c.ballUntil, now + rand(7000, 18000));
          c.stealTries = 0;
          if (soc && inSoc(c) && soc.phase !== "cloud") endSoc(now);
          say(c, pick(["bang", "note", "sparkle"]), now, 0.5);
        }
      }
    }
    function popBall(now) {
      const s = soc && soc.fight;
      const cx = s && s.drawnX != null ? s.drawnX + FW * S / 2 : areaW / 2;
      ball.state = "loose";
      ball.carrier = null;
      ball.x = clamp(cx + rand(-8, 8), BR, areaW - BR);
      ball.y = floorY - FH * S * 0.55;
      ball.vx = pick([-1, 1]) * rand(160, 380);
      ball.vy = -rand(480, 760);
      ball.squashAt = now;
    }

    /* ----- 貓和球 ----- */
    function wants(cat, now) { return cat.ballUntil > now; }
    function ballBusy(cat, now) { return ball.carrier === cat || wants(cat, now); }
    const BALL_ACTS = { ballchase: 1, carry: 1, steal: 1 };
    function desiredBallAct(cat, now) {
      if (ball.carrier === cat && ball.state === "carried") return "carry";
      if (!wants(cat, now)) return null;
      if (ball.state === "loose" || ball.state === "drag") return "ballchase";
      if (ball.state === "carried" && ball.carrier) return now > cat.stealCd ? "steal" : "watch";
      return null;
    }
    function ballThink(cat, now, fromFinish) {
      if (inSoc(cat) || cat.hidden) return false;
      const a = cat.act;
      if (!fromFinish && a && (a.tapped || a.type === "jump" || a.type === "hang" || cat.pendingTap)) return false;
      const want = desiredBallAct(cat, now);
      if (!fromFinish && a && a.type === "stun" && want !== "ballchase") return false;
      if (!want) {
        if (!fromFinish && a && BALL_ACTS[a.type]) { cat.queue = []; finish(cat, now); return true; }
        return false;
      }
      if (!fromFinish && a && a.type === want) return true;
      if (want === "watch") {
        if (!fromFinish && a && a.type === "stun") return true;
        const o = ball.carrier;
        setAct(cat, { type: "stun", dur: Math.max(200, cat.stealCd - now), face: o.x > cat.x ? 1 : -1 }, now);
        return true;
      }
      if (a && a.type === "sleep") say(cat, "bang", now, 0.7);
      setAct(cat, { type: want, speed: 50 }, now);
      if (want === "carry") cat.act.pause = false;
      return true;
    }
    function catchBall(cat, now) {
      ball.state = "carried";
      ball.carrier = cat;
      ball.vx = ball.vy = 0;
      cat.carryUntil = now + rand(3500, 7500);
      cat.stealTries = 0;
      if (cat.act && cat.act.type !== "jump") setAct(cat, { type: "carry", speed: 50 }, now);
      say(cat, pick(["sparkle", "note", "heart"]), now, 0.7);
      /* 另一隻：多半會過來搶 */
      const o = other(cat);
      if (!o.hidden && !inSoc(o)) {
        const sleeping = o.act && o.act.type === "sleep";
        if (!wants(o, now) && Math.random() < (sleeping ? 0.15 : 0.4)) o.ballUntil = now + rand(7000, 15000);
        o.stealCd = now + rand(400, 1200);
        o.stealTries = 0;
      }
    }
    function tryCatch(cat, now, inAir) {
      if (ball.state !== "loose" || now < cat.catchCd) return;
      const m = mouthPos(cat);
      if (Math.hypot(ball.x - m.x, ball.y - m.y) > BR + (inAir ? 14 : 12)) return;
      const sp = Math.hypot(ball.vx, ball.vy);
      const p = sp > 900 ? 0.35 : sp > 450 ? 0.7 : 0.95;
      if (Math.random() < p) { catchBall(cat, now); return; }
      /* 沒咬到：用頭／爪子把球撥開 */
      ball.vx = cat.dir * rand(140, 300);
      ball.vy = -rand(180, 420);
      ball.squashAt = now;
      cat.catchCd = now + 500;
      say(cat, "note", now, 0.4);
    }
    function dropBall(cat, now) {
      if (ball.carrier !== cat) return;
      const m = mouthPos(cat);
      ball.state = "loose";
      ball.carrier = null;
      ball.x = clamp(m.x, BR, areaW - BR); ball.y = Math.min(m.y, floorY - BR);
      ball.vx = cat.dir * rand(60, 220);
      ball.vy = -rand(120, 360);
      cat.catchCd = now + 900;
      /* 放掉之後：有時候自己再追，有時候就不玩了 */
      cat.ballUntil = Math.random() < 0.25 ? now + rand(4000, 9000) : 0;
    }
    function stepToward(cat, tx, speed, dt) {
      const d = tx - cat.x;
      if (Math.abs(d) < 2) return true;
      cat.dir = d > 0 ? 1 : -1;
      cat.x += cat.dir * Math.min(Math.abs(d), speed * dt);
      return false;
    }
    function ballChaseStep(cat, a, now, dt) {
      const center = cat.x + W * S / 2;
      let dir = cat.dir;
      /* 球在背後：要在背後待一下（0.25 秒）才轉身，球被碰一下滾來滾去時不會左右抖 */
      if ((ball.x - center) * dir < -W * S * 0.22) a.behind = (a.behind || 0) + dt; else a.behind = 0;
      if (a.behind > 0.25) { dir = -dir; a.behind = 0; }
      const mx = dir > 0 ? 27.3 : W - 27.3;
      const target = clamp(ball.x - mx * S, minX(), maxX());
      const d = target - cat.x;
      if (dir !== cat.dir) { cat.dir = dir; a.still = true; a.moving = false; return; }
      /* 停／走有緩衝：差 9px 以上才開始走，差 2px 以內才停（不會一步一停地抖） */
      if (a.moving) { if (Math.abs(d) < 2 || Math.sign(d) !== dir) a.moving = false; }
      else if (Math.abs(d) > 9 && Math.sign(d) === dir) a.moving = true;
      if (!a.moving) {
        a.still = true; /* 球就在頭前面／頭底下：停下來 */
      } else {
        a.still = false;
        a.fast = Math.abs(d) > 50 || Math.hypot(ball.vx, ball.vy) > 300;
        cat.x += dir * Math.min(Math.abs(d), (a.fast ? 150 : 62) * dt);
      }
      if (ball.state === "loose") {
        tryCatch(cat, now, false);
        if (cat.act !== a) return;
        /* 球在頭上：跳起來咬 */
        const m = mouthPos(cat);
        const above = m.y - ball.y;
        if (above > 18 && above < 110 && Math.abs(ball.x - m.x) < 55 && ball.vy > -220 && now > cat.jumpCd && Math.random() < 4 * dt) {
          cat.jumpCd = now + rand(1200, 2200);
          const dx = ball.x + ball.vx * 0.3 - m.x;
          const x1 = dx * cat.dir > 0 ? clamp(cat.x + dx, minX(), maxX()) : cat.x;
          setAct(cat, { type: "jump", x1, h: clamp(above + 6, 22, 85), air: rand(480, 560), ballJump: true }, now);
        }
      }
    }
    function carryStep(cat, a, now, dt) {
      const o = other(cat);
      if (now > cat.carryUntil && !a.pause) { dropBall(cat, now); cat.queue = []; finish(cat, now); return; }
      const stealer = o.act && o.act.type === "steal" && !o.hidden ? o : null;
      const near = stealer && Math.abs(o.x - cat.x) < W * S * 1.8;
      if (!near) a.fled = false;
      else if (!a.fled) {
        a.fled = true;
        if (Math.random() < 0.55) { /* 看到對方來搶：叼著跑開 */
          a.pause = false;
          a.tx = o.x < cat.x ? maxX() - rand(0, 30) : minX() + rand(0, 30);
          a.speed = rand(115, 135);
          say(cat, "bang", now, 0.4);
        }
      }
      if (a.pause) {
        if (now > a.pauseUntil) { a.pause = false; a.tx = null; }
        return;
      }
      if (a.tx == null) {
        let tx = rand(minX(), maxX());
        if (Math.abs(tx - cat.x) < 45) tx = cat.x < areaW / 2 ? maxX() - rand(0, 50) : minX() + rand(0, 50);
        a.tx = tx; a.speed = rand(42, 60);
      }
      if (stepToward(cat, a.tx, a.speed, dt)) {
        a.tx = null;
        if (Math.random() < 0.4) { a.pause = true; a.pauseUntil = now + rand(700, 1800); }
      }
    }
    function stealStep(cat, a, now, dt) {
      const c = ball.carrier;
      if (!c || ball.state !== "carried") return;
      const d = c.x - cat.x;
      if (c.act && c.act.tapped) { a.still = true; if (Math.abs(d) > 1) cat.dir = d > 0 ? 1 : -1; return; }
      if (Math.abs(d) < W * S * 0.42) { a.still = true; resolveSteal(cat, c, now); return; }
      a.still = false;
      cat.dir = d > 0 ? 1 : -1;
      cat.x += cat.dir * Math.min(Math.abs(d), rand(140, 160) * dt);
    }
    function resolveSteal(stealer, carrier, now) {
      stealer.stealTries++;
      /* 搶球偶爾才會打起來：上次打架 40 秒內不打 */
      const out = weighted({ fight: now - lastFightAt > 60000 ? 12 : 0, snatch: 42, escape: 36 });
      if (out === "fight") { startBallFight(stealer, carrier, now); return; }
      if (out === "snatch") {
        /* 搶到了！ */
        catchBall(stealer, now);
        say(stealer, "sparkle", now, 0.8);
        setAct(carrier, { type: "stun", dur: rand(600, 1100), face: stealer.x > carrier.x ? 1 : -1 }, now);
        say(carrier, "bang", now, 0.8);
        carrier.stealCd = now + rand(900, 1700);
        carrier.ballUntil = Math.random() < 0.7 ? now + rand(5000, 12000) : 0;
        return;
      }
      /* 沒搶到：叼著的那隻跑掉，搶的那隻愣一下 */
      const a = carrier.act;
      if (a && a.type === "carry") {
        a.pause = false; a.fled = true;
        a.tx = stealer.x < carrier.x ? maxX() : minX();
        a.speed = rand(125, 140);
      }
      carrier.carryUntil += 1200;
      stealer.stealCd = now + rand(700, 1500);
      setAct(stealer, { type: "stun", dur: rand(500, 900) }, now);
      say(stealer, "question", now, 0.7);
      if (stealer.stealTries >= 3 && Math.random() < 0.6) stealer.ballUntil = 0; /* 搶不到就算了 */
    }
    function startBallFight(a, b, now) {
      for (const c of cats) hideBubble(c, now);
      soc = { kind: "fight", a, b, t0: now, phase: "cloud", ready: new Set(), ballFight: true };
      ball.state = "hidden";
      ball.carrier = null;
      startCloud(now);
      soc.popAt = now + (soc.until - now) * rand(0.3, 0.65);
    }

    /* ----- 貓在泡泡後面走過：泡泡表面出現淺深兩層的貓影子 ----- */
    const silDark = document.createElement("canvas");
    const silLight = document.createElement("canvas");
    function makeSil(cv, src, flip, dark) {
      if (cv.width !== src.width || cv.height !== src.height) { cv.width = src.width; cv.height = src.height; }
      const c = cv.getContext("2d");
      c.globalCompositeOperation = "source-over";
      c.clearRect(0, 0, cv.width, cv.height);
      c.save();
      if (flip) { c.translate(cv.width, 0); c.scale(-1, 1); }
      c.drawImage(src, 0, 0);
      c.restore();
      c.globalCompositeOperation = "source-in";
      if (dark) {
        const g = c.createLinearGradient(0, 0, 0, cv.height);
        g.addColorStop(0, "rgba(0,0,0,0.55)");
        g.addColorStop(1, "rgba(0,0,0,1)");
        c.fillStyle = g;
      } else c.fillStyle = "#ffffff";
      c.fillRect(0, 0, cv.width, cv.height);
      c.globalCompositeOperation = "source-over";
    }
    const shadeI = new WeakMap();
    const PEN = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
    function shadeCanvas(el, w, h, make) {
      let cv = el.querySelector(":scope > canvas.bub-shade");
      if (!cv) {
        if (!make) return null;
        cv = document.createElement("canvas");
        cv.className = "bub-shade";
        cv.setAttribute("aria-hidden", "true");
        el.appendChild(cv);
      }
      const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
      const W2 = Math.max(1, Math.round(w * dpr)), H2 = Math.max(1, Math.round(h * dpr));
      if (cv.width !== W2 || cv.height !== H2) { cv.width = W2; cv.height = H2; }
      cv.style.width = w + "px"; cv.style.height = h + "px";
      cv._dpr = dpr;
      return cv;
    }
    function drawShade(now, dt, shapes) {
      /* 在泡泡後面的東西：兩隻貓、打架煙霧團、被叼著的球 */
      const srcs = [];
      for (const c of cats) {
        if (c.hidden || !c.cur) continue;
        if (c._hangOn) {
          const r = c.hangCv.getBoundingClientRect();
          srcs.push({ kind: "cv", cat: c, cv: c.hangCv, flip: c.dir < 0, x: r.left - chatR.left, y: r.top - chatR.top, w: r.width, h: r.height });
          continue;
        }
        const r = c.cv.getBoundingClientRect();
        srcs.push({ kind: "cv", cat: c, cv: c.cv, flip: c.dir < 0, x: r.left - chatR.left, y: r.top - chatR.top, w: r.width, h: r.height });
      }
      if (fightEl.style.display !== "none") {
        const r = fightCv.getBoundingClientRect();
        srcs.push({ kind: "cv", cv: fightCv, flip: false, x: r.left - chatR.left, y: r.top - chatR.top, w: r.width, h: r.height });
      }
      if (tailCv.style.display !== "none") {
        const r = tailCv.getBoundingClientRect();
        srcs.push({ kind: "cv", cv: tailCv, flip: tailCv.style.transform.indexOf("scaleX(-1)") >= 0, x: r.left - chatR.left, y: r.top - chatR.top, w: r.width, h: r.height });
      }
      if (ball.state === "carried") srcs.push({ kind: "ball", x: ball.x - BR, y: ball.y - BR, w: BR * 2, h: BR * 2 });
      for (const s of shapes) {
        const hits = srcs.filter((o) => o.x < s.x + s.w && o.x + o.w > s.x && o.y < s.y + s.h && o.y + o.h > s.y &&
          !(o.cat && o.cat.act && (o.cat.act.type === "bite" || o.cat.act.type === "hang") && o.cat.act.el === s.el));
        let I = shadeI.get(s.el) || 0;
        I += ((hits.length ? 1 : 0) - I) * Math.min(1, dt * 7);
        shadeI.set(s.el, I);
        const cv = shadeCanvas(s.el, s.w, s.h, hits.length > 0);
        if (!cv) continue;
        const sc = cv.getContext("2d");
        const dpr = cv._dpr;
        sc.setTransform(dpr, 0, 0, dpr, 0, 0);
        sc.clearRect(0, 0, s.w, s.h);
        if (I < 0.02 || !hits.length) { if (I < 0.02) cv.remove(); continue; }
        /* 深色泡泡上影子要更明顯一點 */
        const darkBub = !s.el.closest(".row.me");
        sc.save();
        bubblePath(sc, s.w, s.h, s.r);
        sc.clip();
        sc.translate(-s.x, -s.y);
        for (const o of hits) {
          if (o.kind === "ball") {
            sc.globalAlpha = 0.2 * I;
            sc.fillStyle = "#000";
            sc.beginPath(); sc.arc(o.x + BR, o.y + BR + 1, BR + 3, 0, Math.PI * 2); sc.fill();
            sc.globalAlpha = 0.45 * I;
            sc.beginPath(); sc.arc(o.x + BR, o.y + BR + 1, BR - 1, 0, Math.PI * 2); sc.fill();
            continue;
          }
          makeSil(silDark, o.cv, o.flip, true);
          makeSil(silLight, o.cv, o.flip, false);
          sc.imageSmoothingEnabled = true;
          /* 淺色：外圈柔和的半影 */
          sc.globalAlpha = (darkBub ? 0.09 : 0.07) * I;
          for (const [px, py] of PEN) sc.drawImage(silDark, o.x + px * 5, o.y + py * 5 + 2, o.w, o.h);
          sc.globalAlpha = (darkBub ? 0.11 : 0.09) * I;
          for (const [px, py] of PEN) sc.drawImage(silDark, o.x + px * 2.5, o.y + py * 2.5 + 1, o.w, o.h);
          /* 亮邊：背後透過來的一點光，讓影子有淺有深 */
          sc.globalAlpha = (darkBub ? 0.3 : 0.22) * I;
          sc.drawImage(silLight, o.x, o.y - 2, o.w, o.h);
          /* 深色：貓身體的本影（腳那邊比較深） */
          sc.globalAlpha = (darkBub ? 0.62 : 0.45) * I;
          sc.drawImage(silDark, o.x, o.y + 0.5, o.w, o.h);
        }
        sc.restore();
      }
    }

    /* ----- 建立兩隻貓 ----- */
    const cats = [];
    function makeCat(name, x, dir) {
      const el = document.createElement("div");
      el.className = "cat cat-" + name;
      const shadow = document.createElement("div");
      shadow.className = "cat-shadow";
      const body = document.createElement("div");
      body.className = "cat-body";
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const bubble = document.createElement("div");
      bubble.className = "cat-bubble";
      body.appendChild(cv);
      body.appendChild(bubble);
      el.appendChild(shadow);
      el.appendChild(body);
      layer.appendChild(el);
      const ctx = cv.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      return {
        name, el, shadow, body, cv, ctx, bubble,
        x, y: 0, dir, cur: null, curDir: 0, hidden: false,
        act: null, queue: [],
        mood: pick(Object.keys(MOOD_ICONS)),
        turnUntil: 0, ballUntil: 0, stealCd: 0, stealTries: 0, catchCd: 0, jumpCd: 0, carryUntil: 0,
        bubbleUntil: 0,
        nextBubble: performance.now() + rand(3000, 9000)
      };
    }

    const now0 = performance.now();
    cats.push(makeCat("brown", 0, 1));
    cats.push(makeCat("gray", 0, -1));
    layer.appendChild(fightEl); /* 煙霧團疊在貓上面 */
    measure();
    cats[0].x = maxX() * 0.18;
    cats[1].x = maxX() * 0.78;
    cats[0].act = { type: "sit", t0: now0, dur: rand(1200, 2000) };
    cats[1].act = { type: "lick1", t0: now0, dur: rand(2000, 2800) };

    const FPS = { walk: 7, run: 8, lick1: 4, lick2: 3, lick3: 4, sleep: 1.1, scratch: 6 };

    function other(cat) { return cats[0] === cat ? cats[1] : cats[0]; }
    function plannedX(cat) {
      const a = cat.act;
      if (a && (a.type === "walk" || a.type === "run")) return a.tx;
      if (a && a.type === "jump") return a.x1;
      return cat.x;
    }
    function freeSpot(cat) {
      const ox = plannedX(other(cat));
      const gap = GAP();
      const left = [minX(), ox - gap], right = [ox + gap, maxX()];
      const opts = [];
      if (left[1] - left[0] > 4) opts.push(left);
      if (right[1] - right[0] > 4) opts.push(right);
      if (!opts.length) return rand(minX(), maxX());
      const r = pick(opts);
      return rand(r[0], r[1]);
    }
    function crowded(cat, x) {
      return Math.abs(x - plannedX(other(cat))) < GAP();
    }
    function moveAct(type, tx, speed) {
      return { type, tx: clamp(tx, Math.min(minX(), wallX(-1)), Math.max(maxX(), wallX(1))), speed: speed || (type === "run" ? rand(120, 160) : rand(32, 46)) };
    }

    /* ----- 單獨行為 ----- */
    function plan(cat) {
      /* 平常多半安安靜靜：坐著、趴著、舔毛、睡覺；偶爾才走動 */
      const t = weighted({ walk: 8, run: 3, jump: 4, sit: 14, loaf: 12, lick1: 8, lick2: 8, lick3: 8, sleep: 14, scratch: 4, look: 8,
        ball: ball.state === "loose" ? 3 : 0 });
      if (t === "ball") {
        /* 自己想起那顆球，過去玩 */
        cat.ballUntil = performance.now() + rand(6000, 15000);
        cat.queue.push({ type: "sit", dur: 150 });
        return;
      }
      if (t === "look") {
        /* 坐著東張西望：先看一邊，轉頭（轉身）再看另一邊 */
        if (crowded(cat, cat.x)) cat.queue.push(moveAct("walk", freeSpot(cat)));
        cat.queue.push({ type: "sit", dur: rand(900, 1600) });
        cat.queue.push({ type: "sit", dur: rand(900, 1800), flip: true });
        return;
      }
      if (t === "walk" || t === "run") {
        let tx = rand(minX(), maxX());
        if (Math.abs(tx - cat.x) < 50) tx = cat.x < areaW / 2 ? maxX() - rand(0, 40) : rand(0, 40);
        cat.queue.push(moveAct(t, tx));
        return;
      }
      if (t === "scratch") {
        const o = other(cat);
        let side = cat.x + W * S / 2 < areaW / 2 ? -1 : 1;
        if (Math.random() < 0.3) side = -side;
        const oa = o.act;
        if (oa && oa.side === side) side = -side;
        const wx = wallX(side);
        if (Math.abs(cat.x - wx) > 6) cat.queue.push(moveAct(Math.random() < 0.4 ? "run" : "walk", side > 0 ? maxX() : minX()));
        cat.queue.push({ type: "scratch", side, dur: rand(2400, 4200) });
        return;
      }
      if (t === "jump") {
        cat.queue.push({ type: "jump" });
        return;
      }
      /* 坐、舔毛、睡覺：太靠近另一隻就先走開，不會一直疊在一起 */
      if (crowded(cat, cat.x)) cat.queue.push(moveAct("walk", freeSpot(cat)));
      const dur = t === "sleep" ? rand(7000, 13000) : t === "sit" ? rand(2500, 5000) : t === "loaf" ? rand(3000, 6500) : rand(2600, 4200);
      cat.queue.push({ type: t, dur });
    }

    const MOVE_TYPES = { walk: 1, run: 1, flee: 1, chase: 1, follow: 1, ballchase: 1, carry: 1, steal: 1 };
    function start(cat, a, now) {
      a.t0 = now;
      const d0 = cat.dir;
      if (a.flip) cat.dir = -cat.dir;
      if (a.type === "walk" || a.type === "run") {
        if (Math.abs(a.tx - cat.x) < 2) { a.done = true; }
        else cat.dir = a.tx > cat.x ? 1 : -1;
      } else if (a.type === "flee") {
        if (a.tx == null) a.tx = cat.x + W * S / 2 < areaW / 2 ? maxX() : minX();
        cat.dir = a.tx > cat.x ? 1 : -1;
      } else if (a.type === "scratch") {
        cat.dir = a.side;
        cat.x = wallX(a.side);
      } else if (a.type === "jump") {
        let x1;
        if (a.x1 != null) {
          x1 = a.x1;
          if (Math.abs(x1 - cat.x) > 1) cat.dir = x1 > cat.x ? 1 : -1;
        } else {
          const dist = Math.random() < 0.3 ? 0 : rand(20, 70);
          x1 = cat.x + cat.dir * dist;
          if (x1 < minX() || x1 > maxX()) { cat.dir = -cat.dir; x1 = cat.x + cat.dir * dist; }
        }
        a.x0 = cat.x;
        a.x1 = clamp(x1, minX(), maxX());
        a.h = a.h || rand(30, 56);
        a.air = a.air || rand(520, 640);
        a.dur = 150 + a.air + 130;
      } else if (a.type === "sleep") {
        if (!a.keepDir && Math.random() < 0.5) cat.dir = -cat.dir;
      }
      if (a.face) cat.dir = a.face;
      /* 要往反方向走：先原地轉身，再往前走（不會倒退走） */
      if (cat.dir !== d0 && MOVE_TYPES[a.type]) cat.turnUntil = now + 150;
      cat.act = a;
    }

    function finish(cat, now) {
      const t = cat.act && cat.act.type;
      if (cat.pendingTap && t === "jump") { cat.pendingTap = false; cat.y = 0; tapSit(cat, now); return; }
      if (soc && inSoc(cat)) {
        /* 一起玩時：這段動作做完就先站著等，下一步由互動劇本決定 */
        cat.act = { type: "sit", t0: now, dur: 1e9, idle: true };
        soc.ready.add(cat);
        return;
      }
      if (t === "sleep") cat.mood = pick(["happy", "happy", "hungry", "curious"]);
      else if (t === "run" || t === "jump" || t === "scratch") cat.mood = Math.random() < 0.6 ? "playful" : cat.mood;
      else if (t && t.startsWith("lick")) cat.mood = Math.random() < 0.5 ? "happy" : "sleepy";
      else if (Math.random() < 0.3) cat.mood = pick(Object.keys(MOOD_ICONS));
      if (!cat.queue.length && ballThink(cat, now, true)) return;
      if (!cat.queue.length) plan(cat);
      start(cat, cat.queue.shift(), now);
    }

    function showBubble(cat, now, icon) {
      const a = cat.act;
      icon = icon || (a && a.type === "sleep" ? "zzz" : pick(MOOD_ICONS[cat.mood]));
      cat.bubble.innerHTML = iconSVG(icon);
      cat.bubble.classList.add("show");
      cat.bubbleUntil = now + rand(2000, 3000);
    }
    function hideBubble(cat, now) {
      cat.bubble.classList.remove("show");
      cat.bubbleUntil = 0;
      cat.nextBubble = now + rand(3000, 8000);
    }
    /* 互動時的泡泡：在地上才冒，半空中不冒 */
    function say(cat, icon, now, p) {
      if (p != null && Math.random() > p) return;
      if (cat.y > 0.5 || cat.hidden) return;
      showBubble(cat, now, icon);
    }

    /* =====================================================================
       互動劇本（常常發生）：追逐、打架煙霧團、跟著走、靠在一起、對看後撲過去
       ===================================================================== */
    let soc = null;
    let nextSocialAt = now0 + rand(5000, 8000);
    function inSoc(c) { return !!soc && (soc.a === c || soc.b === c); }
    function setAct(cat, a, now) {
      if (soc) soc.ready.delete(cat);
      cat.queue = [];
      start(cat, a, now);
    }
    function faceEach(a, b) {
      if (a.x <= b.x) { a.dir = 1; b.dir = -1; } else { a.dir = -1; b.dir = 1; }
    }
    function bothReady() { return soc.ready.has(soc.a) && soc.ready.has(soc.b); }
    function canJoin(c, now) {
      const a = c.act;
      if (!a || a.tapped || a.type === "jump" || a.type === "bite" || a.type === "hang" || c.pendingTap) return false;
      if (biteBusy(c)) return false;
      if (a.type === "sleep" && now - a.t0 < 4500) return false;
      if (ballBusy(c, now) || ball.state !== "loose" && ball.state !== "carried") return false;
      return true;
    }

    /* 兩隻走到彼此旁邊（不會疊在一起），面對面後再做下一步 */
    function arrange(now, center, gap, then, speed) {
      const [L, R] = soc.a.x <= soc.b.x ? [soc.a, soc.b] : [soc.b, soc.a];
      let lx = center - gap / 2, rx = center + gap / 2;
      if (lx < minX()) { rx += minX() - lx; lx = minX(); }
      if (rx > maxX()) { lx -= rx - maxX(); rx = maxX(); }
      lx = Math.max(minX(), lx);
      soc.phase = "arrange";
      soc.then = then;
      soc.ready.clear();
      for (const [c, tx] of [[L, lx], [R, rx]]) {
        if (Math.abs(c.x - tx) < 2) { soc.ready.add(c); c.act = { type: "sit", t0: now, dur: 1e9, idle: true }; }
        else setAct(c, moveAct("walk", tx, speed || rand(44, 54)), now);
      }
    }
    function rest(now, kind) {
      const center = (soc.a.x + soc.b.x) / 2;
      arrange(now, center, GAP(), (now) => {
        faceEach(soc.a, soc.b);
        const [p, q] = Math.random() < 0.5 ? [soc.a, soc.b] : [soc.b, soc.a];
        const dur = rand(1800, 3000);
        if (kind === "nap") {
          setAct(p, { type: "sleep", dur: 1e9, keepDir: true }, now);
          setAct(q, { type: Math.random() < 0.5 ? "sleep" : "lick2", dur: 1e9, keepDir: true }, now);
          soc.until = now + rand(6000, 9500);
          say(p, "zzz", now); say(q, "heart", now, 0.7);
        } else {
          setAct(p, { type: "sit", dur: 1e9 }, now);
          setAct(q, { type: Math.random() < 0.45 ? pick(["lick1", "lick2"]) : "sit", dur: 1e9 }, now);
          soc.until = now + dur;
          say(p, pick(["heart", "note", "sparkle"]), now);
          say(q, pick(["heart", "note", "sparkle"]), now + 0, 0.6);
        }
        faceEach(soc.a, soc.b);
        soc.phase = "rest";
      });
    }

    function startChase(chaser, runner, now, opts) {
      opts = opts || {};
      soc = { kind: "chase", a: chaser, b: runner, chaser, runner, t0: now, phase: "run", ready: new Set(), swaps: opts.swaps || 0, fromFight: !!opts.fromFight };
      let tx = null;
      if (opts.awayFrom != null) tx = opts.awayFrom < areaW / 2 ? maxX() : minX();
      else tx = chaser.x <= runner.x ? (maxX() - runner.x > 40 ? maxX() : minX()) : (runner.x - minX() > 40 ? minX() : maxX());
      setAct(runner, { type: "flee", tx, speed: rand(118, 138) }, now);
      setAct(chaser, { type: "chase", speed: rand(150, 168), wait: opts.wait || rand(150, 350) }, now);
      if (!opts.fromFight) { say(runner, "bang", now, 0.5); say(chaser, pick(["note", "sparkle"]), now, 0.5); }
    }
    function chaseCaught(now) {
      const s = soc;
      const out = weighted({ fight: s.fromFight || !fightOK(now) ? 0 : 7, swap: s.swaps < 2 ? 30 : 0, pounce: 26, pause: 24 });
      if (out === "fight") { startCloud(now); return; }
      if (out === "swap") {
        say(s.chaser, "bang", now, 0.6);
        startChase(s.runner, s.chaser, now, { swaps: s.swaps + 1, wait: rand(250, 450), fromFight: s.fromFight });
        return;
      }
      if (out === "pounce") {
        const { chaser, runner } = s;
        setAct(runner, { type: "sit", dur: 1e9 }, now);
        faceEach(chaser, runner);
        let x1 = runner.x - chaser.dir * GAP() * 0.95;
        if (x1 < minX() || x1 > maxX()) x1 = runner.x + chaser.dir * GAP() * 0.95;
        setAct(chaser, { type: "jump", x1, h: rand(26, 38), air: rand(440, 520) }, now);
        s.phase = "pounce";
        return;
      }
      rest(now);
    }

    function startFight(now) {
      const [a, b] = Math.random() < 0.5 ? [cats[0], cats[1]] : [cats[1], cats[0]];
      soc = { kind: "fight", a, b, t0: now, phase: "approach", ready: new Set() };
      setAct(a, { type: "chase", speed: rand(130, 150), wait: 0 }, now);
      setAct(b, { type: "chase", speed: rand(130, 150), wait: rand(0, 200) }, now);
      say(a, "bang", now, 0.6);
    }
    function startCloud(now) {
      const s = soc;
      lastFightAt = now;
      s.kind = "fight";
      s.phase = "cloud";
      s.until = now + rand(2200, 3400);
      const cx = (s.a.x + s.b.x) / 2 + W * S / 2;
      s.fight = { t0: now, cx, limbs: [] };
      for (const c of [s.a, s.b]) {
        setAct(c, { type: "fight", dur: 1e9 }, now);
        c.hidden = true;
        hideBubble(c, now);
        c.el.style.visibility = "hidden";
      }
      fightEl.style.display = "";
    }
    function endCloud(now) {
      const s = soc;
      fightEl.style.display = "none";
      const cx = s.fight.cx;
      const breaker = Math.random() < 0.5 ? s.a : s.b, chaser = other(breaker);
      const away = cx < areaW / 2 ? 1 : -1;
      breaker.x = clamp(cx - W * S / 2 + away * 10, minX(), maxX());
      chaser.x = clamp(cx - W * S / 2 - away * 6, minX(), maxX());
      for (const c of cats) { c.hidden = false; c.el.style.visibility = ""; c.stealTries = 0; }
      lastFightAt = now;
      if (s.ballFight) {
        if (ball.state === "hidden") popBall(now);
        /* 搶球打完：隨機——一隻逃一隻追、兩隻回去搶球、或各自去做自己的事 */
        const r = weighted({ chase: 30, ball: 40, own: 30 });
        if (r !== "chase") {
          for (const c of cats) {
            c.ballUntil = r === "ball" ? (Math.random() < 0.85 ? now + rand(6000, 14000) : 0) : (Math.random() < 0.2 ? now + rand(4000, 9000) : 0);
            c.stealCd = now + rand(600, 1500);
          }
          say(breaker, pick(["bang", "sparkle", "note"]), now, 0.7);
          endSoc(now);
          return;
        }
        for (const c of cats) c.ballUntil = Math.random() < 0.5 ? now + rand(5000, 10000) : 0;
      }
      /* 一隻衝出煙霧逃走，另一隻馬上追 */
      startChase(chaser, breaker, now, { fromFight: true, awayFrom: cx, wait: rand(120, 220) });
      say(breaker, pick(["bang", "sparkle"]), now, 0.7);
      say(chaser, pick(["note", "bang"]), now, 0.4);
    }

    function startFollow(now) {
      const mid = (cats[0].x + cats[1].x) / 2;
      const dir = mid < areaW / 2 ? 1 : -1;
      const leader = (cats[0].x - cats[1].x) * dir > 0 ? cats[0] : cats[1];
      const follower = other(leader);
      soc = { kind: "follow", a: leader, b: follower, leader, follower, t0: now, phase: "walk", ready: new Set() };
      const tx = dir > 0 ? maxX() - rand(0, 40) : minX() + rand(0, 40);
      setAct(leader, moveAct("walk", tx, rand(38, 46)), now);
      setAct(follower, { type: "follow", speed: rand(50, 58) }, now);
      say(follower, pick(["heart", "note"]), now, 0.6);
    }
    function startCuddle(now) {
      soc = { kind: "cuddle", a: cats[0], b: cats[1], t0: now, phase: "", ready: new Set() };
      const center = clamp(rand(areaW * 0.3, areaW * 0.7) - W * S / 2, minX() + GAP() / 2, maxX() - GAP() / 2);
      const kind = Math.random() < 0.55 ? "nap" : "sit";
      arrange(now, center, GAP(), () => { soc.phase = ""; rest(performance.now(), kind); });
    }
    function startFaceoff(now) {
      soc = { kind: "faceoff", a: cats[0], b: cats[1], t0: now, phase: "", ready: new Set() };
      const center = clamp((cats[0].x + cats[1].x) / 2, minX() + GAP() * 0.7, maxX() - GAP() * 0.7);
      arrange(now, center, GAP() * 1.4, (now) => {
        faceEach(soc.a, soc.b);
        setAct(soc.a, { type: "sit", dur: 1e9 }, now);
        setAct(soc.b, { type: "sit", dur: 1e9 }, now);
        faceEach(soc.a, soc.b);
        say(soc.a, pick(["question", "bang"]), now);
        say(soc.b, pick(["question", "note"]), now, 0.6);
        soc.phase = "stare";
        soc.until = now + rand(1200, 2000);
      });
    }

    function startSocial(now) {
      /* 打架很少：大部分是追逐、跟著走、靠在一起；打完架 25 秒內不會再打 */
      const k = weighted({ chase: 24, fight: fightOK(now) ? 3 : 0, follow: 18, cuddle: 26, faceoff: 10, love: 12 });
      for (const c of cats) hideBubble(c, now);
      if (k === "chase") { const c = pick(cats); startChase(c, other(c), now); }
      else if (k === "fight") startFight(now);
      else if (k === "follow") startFollow(now);
      else if (k === "cuddle") startCuddle(now);
      else if (k === "love") startLove(now);
      else startFaceoff(now);
    }
    function endSoc(now) {
      const s = soc;
      if (!s) return;
      soc = null;
      if (s.kind === "love") endLove();
      fightEl.style.display = "none";
      if (ball.state === "hidden") popBall(now);
      for (const c of [s.a, s.b]) {
        c.hidden = false; c.el.style.visibility = "";
        const t = c.act && c.act.type;
        if (c.act && (c.act.idle || c.act.dur >= 1e9 || t === "chase" || t === "flee" || t === "follow" || t === "fight" || t === "walk")) {
          c.queue = [];
          c.act = { type: "sit", t0: now, dur: 0 };
          finish(c, now);
        }
      }
      nextSocialAt = now + rand(7000, 14000);
    }

    function socStep(now) {
      const s = soc;
      if (!s) return;
      if (now - s.t0 > 30000) { endSoc(now); return; } /* 保險：任何互動最多 30 秒 */
      if (s.phase === "arrange") { if (bothReady()) { const f = s.then; s.then = null; f(now); } return; }
      if (s.phase === "rest") { if (now > s.until) endSoc(now); return; }
      if (s.kind === "chase") {
        if (s.phase === "run") {
          const dx = Math.abs(s.chaser.x - s.runner.x);
          const t = now - s.t0;
          if ((t > 1500 && dx < W * S * 0.3) || t > 9000) chaseCaught(now);
        } else if (s.phase === "pounce" && s.ready.has(s.chaser)) {
          say(s.runner, pick(["heart", "sparkle", "bang"]), now);
          rest(now);
        }
      } else if (s.kind === "fight") {
        if (s.phase === "approach") {
          if (Math.abs(s.a.x - s.b.x) < W * S * 0.35 || now - s.t0 > 6000) startCloud(now);
        } else if (s.phase === "cloud") {
          drawFight(now);
          if (s.ballFight && ball.state === "hidden" && now > s.popAt) popBall(now);
          if (now > s.until) endCloud(now);
        }
      } else if (s.kind === "follow") {
        if (s.ready.has(s.leader)) rest(now);
      } else if (s.kind === "love") {
        loveStep(now);
      } else if (s.kind === "faceoff" && s.phase === "stare" && now > s.until) {
        /* 對看一下，然後一隻撲過去，另一隻逃跑 → 變成追逐 */
        const p = pick([s.a, s.b]), q = other(p);
        startChase(p, q, now, { wait: rand(100, 200) });
      }
    }

    /* ----- 點一下貓：那隻坐下、冒愛心，一會兒再回去自己玩 ----- */
    function tapSit(cat, now) {
      if (soc && inSoc(cat)) endSoc(now);
      if (cat.act && cat.act.type === "jump") { cat.pendingTap = true; return; }
      /* 吊在泡泡上被點：先放開掉下來，落地後再坐下比愛心 */
      if (cat.act && cat.act.type === "hang" && cat.act.phase !== "sit") { cat.pendingTap = true; cat.act.drop = true; if (cat.act.phase !== "crouch" && cat.act.phase !== "rise" && cat.act.phase !== "hang" && cat.act.phase) return; hangDrop(cat, cat.act, now); return; }
      cat.y = 0;
      cat.queue = [];
      start(cat, { type: "sit", dur: rand(2600, 3400), tapped: true }, now);
      showBubble(cat, now, "heart");
      cat.bubbleUntil = now + 2400;
      nextSocialAt = Math.max(nextSocialAt, now + 3500);
    }
    /* 只有貓身上真的有像素的地方才算點到；旁邊的空白照樣交給聊天室（長按刪除、選單、清除鍵都不受影響） */
    function underBubble(cx, cy) {
      const el = document.elementFromPoint(cx, cy);
      return !!(el && el.closest && el.closest(".bub, .sys, #msgMenu, .c-bar, .c-input, button, a, input, textarea, select, label, dialog, .c-settings, .c-stickers, .c-rxpick, .c-plantfan, .c-plus, .c-veil, .c-pad, .c-jump, .lightbox, .c-ann, .c-offline, .c-openbar, .c-stealthbar"));
    }
    function hitCat(cx, cy) {
      /* 貓在泡泡後面：點到泡泡就是泡泡（長按選單照常） */
      if (underBubble(cx, cy)) return null;
      const order = cats.slice().sort((p, q) => (+q.el.style.zIndex || 1) - (+p.el.style.zIndex || 1));
      for (const c of order) {
        if (c.hidden || !c.cur) continue;
        if (c._hangOn) { if (hangMaskHit(c, cx, cy)) return c; continue; }
        const r = c.cv.getBoundingClientRect();
        const pad = 2 * S;
        if (cx < r.left - pad || cx > r.right + pad || cy < r.top - pad || cy > r.bottom + pad) continue;
        let px = Math.floor((cx - r.left) / S), py = Math.floor((cy - r.top) / S);
        if (c.dir < 0) px = W - 1 - px;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const X = px + dx, Y = py + dy;
          if (X >= 0 && X < W && Y >= 0 && Y < H && c.cur.mask[Y * W + X]) return c;
        }
      }
      return null;
    }
    function hitCloud(cx, cy) {
      if (fightEl.style.display === "none" || underBubble(cx, cy)) return false;
      const r = fightCv.getBoundingClientRect();
      return cx >= r.left && cx <= r.right && cy >= r.top + r.height * 0.1 && cy <= r.bottom;
    }
    let catPointer = null, swallowCatClick = 0;
    window.addEventListener("pointerdown", (e) => {
      if (e.button > 0 || !chatLive()) return;
      if (ballHit(e.clientX, e.clientY)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        catPointer = e.pointerId;
        swallowCatClick = performance.now() + 700;
        grabBall(e, performance.now());
        return;
      }
      const cat = hitCat(e.clientX, e.clientY);
      const cloud = !cat && hitCloud(e.clientX, e.clientY);
      if (!cat && !cloud) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      catPointer = e.pointerId;
      swallowCatClick = performance.now() + 700;
      /* 打架煙霧團裡的貓點不到：等牠們打完再說（不會硬拆，畫面比較順） */
      if (cat) tapSit(cat, performance.now());
    }, { capture: true, passive: false });
    for (const ev of ["pointerup", "pointermove", "pointercancel"]) {
      window.addEventListener(ev, (e) => {
        if (catPointer === null || e.pointerId !== catPointer) return;
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (ball.state === "drag" && ball.dragId === e.pointerId) {
          if (ev === "pointermove") dragBall(e, performance.now());
          else releaseBall(e, performance.now(), ev === "pointercancel");
        }
        if (ev !== "pointermove") catPointer = null;
      }, { capture: true });
    }
    for (const ev of ["click", "contextmenu"]) {
      window.addEventListener(ev, (e) => {
        if (performance.now() > swallowCatClick) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (ev === "click") swallowCatClick = 0;
      }, { capture: true });
    }

    /* 沒在移動的貓一定是坐著或趴著：站著不動超過 0.38 秒就改成側坐（不會側身站著發抖） */
    function frameFor(cat, now) {
      const f = frameFor0(cat, now);
      if (f && f.stand && cat.stillMs > 380 && cat.y < 0.5) return SPRITES[cat.name].love[SIDE_I];
      return f;
    }
    function frameFor0(cat, now) {
      const a = cat.act;
      const e = Math.max(0, now - a.t0);
      const loop = (anim) => {
        const fr = SPRITES[cat.name][anim];
        return fr[Math.floor(e / 1000 * (FPS[anim] || 4)) % fr.length] || fr[0];
      };
      const fr = SPRITES[cat.name];
      if (MOVE_TYPES[a.type] && now < cat.turnUntil) return fr.walk[0]; /* 轉身中：站著 */
      switch (a.type) {
        case "ballchase": return a.still ? fr.walk[0] : a.fast ? loop("run") : loop("walk");
        case "steal": return a.still ? fr.walk[0] : loop("run");
        case "carry": return a.pause ? fr.sit[0] : a.speed > 90 ? loop("run") : loop("walk");
        case "stun": return fr.sit[0];
        case "walk": return loop("walk");
        case "run": case "flee": return loop("run");
        case "chase": return e < (a.wait || 0) ? SPRITES[cat.name].run[0] : loop("run");
        case "follow": return a.still ? SPRITES[cat.name].walk[0] : loop("walk");
        case "jump": {
          const j = SPRITES[cat.name].jump;
          if (e < 150) return j[0];
          if (e < 150 + a.air) return (e - 150) / a.air < 0.5 ? j[1] : j[2];
          return j[0];
        }
        case "bonk": return a.sideF ? fr.love[SIDE_I] : fr.sit[0];
        case "sit": case "fight": return SPRITES[cat.name].sit[0];
        case "love": { const i = Object.keys(LOVE_KEYS).indexOf(a.fk); return fr.love[i >= 0 ? i : 0]; }
        case "bite": return a.fi === -1 ? (a.si > 0 ? fr.love[SIDE_I] : fr.walk[0]) : a.fi === 4 ? fr.sit[0] : fr.bite[a.fi];
        case "loaf": return (e % 5200) > 4300 ? fr.love[SIDE_HAPPY_I] : fr.love[SIDE_I];
        case "hang": {
          const j = fr.jump;
          if (a.phase === "rise") return j[1];
          if (a.phase === "fall") return j[2];
          if (a.phase === "sit") return fr.love[SIDE_I];
          return j[0];
        }
        default: return loop(a.type);
      }
    }

    function update(cat, now, dt) {
      const a = cat.act;
      const px = cat.x, pd = cat.dir;
      moveCat(cat, a, now, dt);
      /* 保險：移動方向一定等於臉的方向。要掉頭就先停下轉身（不倒退走、不滑步） */
      if (cat.act === a && MOVE_TYPES[a.type]) {
        const dx = cat.x - px;
        if (now < cat.turnUntil) cat.x = px;
        else if (cat.dir !== pd) { cat.x = px; cat.turnUntil = now + 150; }
        else if (Math.abs(dx) > 0.01 && Math.sign(dx) !== cat.dir) { cat.x = px; cat.dir = Math.sign(dx); cat.turnUntil = now + 150; }
      }
      /* 有沒有真的在移動（來回抖幾 px 不算移動） */
      if (cat.anchorX == null || Math.abs(cat.x - cat.anchorX) > 4 || cat.y > 0.5) { cat.anchorX = cat.x; cat.stillMs = 0; }
      else cat.stillMs = (cat.stillMs || 0) + dt * 1000;
      bubbleStep(cat, now);
    }
    function moveCat(cat, a, now, dt) {
      const e = Math.max(0, now - a.t0);
      if (a.type === "hang") { hangStep(cat, a, now, dt); return; }
      cat.y = 0;
      if (a.type === "ballchase") { ballChaseStep(cat, a, now, dt); return; }
      if (a.type === "carry") { carryStep(cat, a, now, dt); return; }
      if (a.type === "steal") { stealStep(cat, a, now, dt); return; }
      if (a.type === "bite") { biteStep(cat, a, now, dt); return; }
      if (a.type === "walk" || a.type === "run") {
        const step = a.speed * dt;
        const d = a.tx - cat.x;
        if (a.done || Math.abs(d) <= step) { cat.x = a.tx; finish(cat, now); return; }
        cat.x += Math.sign(d) * step;
      } else if (a.type === "flee") {
        const step = a.speed * dt;
        const d = a.tx - cat.x;
        if (Math.abs(d) <= step) {
          cat.x = a.tx;
          /* 跑到邊邊就轉身往回跑 */
          a.tx = a.tx > (minX() + maxX()) / 2 ? minX() : maxX();
          cat.dir = a.tx > cat.x ? 1 : -1;
        } else { cat.x += Math.sign(d) * step; cat.dir = Math.sign(d); }
      } else if (a.type === "chase") {
        if (e >= (a.wait || 0)) {
          const o = other(cat);
          const d = o.x - cat.x;
          if (Math.abs(d) > 1) cat.dir = d > 0 ? 1 : -1;
          cat.x += Math.sign(d) * Math.min(Math.abs(d), a.speed * dt);
        } else {
          const o = other(cat);
          if (Math.abs(o.x - cat.x) > 1) cat.dir = o.x > cat.x ? 1 : -1;
        }
      } else if (a.type === "follow") {
        const o = other(cat);
        const target = clamp(o.x - o.dir * GAP() * 0.85, minX(), maxX());
        const d = target - cat.x;
        const step = Math.min(Math.abs(d), a.speed * dt);
        /* 跟著走也有緩衝：離目標 10px 以上才走，3px 以內就停下來坐 */
        if (a.moving) { if (Math.abs(d) < 3) a.moving = false; }
        else if (Math.abs(d) > 10) a.moving = true;
        a.still = !a.moving;
        if (a.moving) { cat.dir = d > 0 ? 1 : -1; cat.x += Math.sign(d) * step; }
      } else if (a.type === "jump") {
        if (e >= a.dur) { cat.x = a.x1; finish(cat, now); return; }
        if (e >= 150 && e < 150 + a.air) {
          const p = (e - 150) / a.air;
          cat.x = a.x0 + (a.x1 - a.x0) * p;
          cat.y = 4 * a.h * p * (1 - p);
          if (a.ballJump) tryCatch(cat, now, true);
        }
      } else if (e >= a.dur) { finish(cat, now); return; }
    }
    function bubbleStep(cat, now) {
      /* 心情泡泡：偶爾、隨機出現；半空中和煙霧團裡不冒 */
      if (cat.bubbleUntil && now > cat.bubbleUntil) {
        hideBubble(cat, now);
        if (soc && inSoc(cat)) cat.nextBubble = now + rand(1800, 4000);
      } else if (!cat.bubbleUntil && now > cat.nextBubble) {
        const t = cat.act.type;
        let chance = t === "sleep" ? 0.85 : t === "run" || t === "jump" || t === "fight" ? 0 : 0.6;
        if (t === "chase" || t === "flee") chance = 0.45;
        if (cat.hidden || (t === "hang" && cat.act.phase !== "sit")) chance = 0;
        if (Math.random() < chance) showBubble(cat, now, t === "chase" || t === "flee" ? pick(PLAY_ICONS) : (soc && inSoc(cat) && t !== "sleep" ? pick(["heart", "note", "sparkle"]) : null));
        else cat.nextBubble = now + rand(2500, 7000);
      }
    }

    const BONK_MIN_V = 260;
    const BONK_CD = 2500;
    const BONK_OK = { walk: 1, run: 1, sit: 1, loaf: 1, lick1: 1, lick2: 1, lick3: 1, sleep: 1, scratch: 1, stun: 1, ballchase: 1, steal: 1, bonk: 1, chase: 1, follow: 1, flee: 1 };
    function eyesOf(f) {
      if (f.eyes) return f.eyes;
      const src = f.src || f;
      const cw = src.cv.width, ch = src.cv.height;
      const d = src.cv.getContext("2d").getImageData(0, 0, cw, ch).data;
      const at = (x, y) => { const i = (y * cw + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
      const isW = (p) => p[3] > 128 && p[0] > 235 && p[1] > 235 && p[2] > 235;
      const isK = (p) => p[3] > 128 && p[0] < 20 && p[1] < 20 && p[2] < 20;
      const fur = (p) => p[3] > 128 && !isW(p) && !isK(p);
      let eyes = [];
      for (let y = 1; y < ch - 1; y++) for (let x = 1; x < cw - 1; x++) {
        if (isW(at(x, y)) && isK(at(x, y + 1)) && fur(at(x - 1, y)) && fur(at(x + 1, y))) {
          const c = at(x - 1, y);
          eyes.push({ x, y, fur: "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")" });
        }
      }
      const furOf = (x, y) => { const c = at(Math.max(0, Math.min(cw - 1, x)), Math.max(0, Math.min(ch - 1, y))); return fur(c) ? "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")" : null; };
      if (!eyes.length) {
        const top = src.top, cx = src.cx;
        const cand = src.side ? [[Math.round(cx + 4), top + 5]] : [[Math.round(cx - 2), top + 5], [Math.round(cx + 2), top + 5]];
        eyes = cand.map(([x, y]) => ({ x, y, fur: furOf(x - 1, y) || furOf(x, y - 1) || "#a79e99" }));
      }
      eyes.sort((p, q) => p.x - q.x);
      if (f.src) eyes = eyes.map((e) => ({ x: e.y, y: 31 - e.x, fur: e.fur, rot: true }));
      f.eyes = eyes;
      return eyes;
    }
    function drawBonkEyes(ctx, f, dy) {
      const eyes = eyesOf(f);
      eyes.forEach((e, i) => {
        const x = e.x, y = e.y + dy;
        ctx.fillStyle = e.fur;
        ctx.fillRect(x - 1, y - 1, 3, 3);
        ctx.fillStyle = "#010101";
        let px;
        if (e.rot) px = [[x - 1, y + 1], [x, y], [x + 1, y + 1]];
        else if (eyes.length >= 2 && i === eyes.length - 1) px = [[x + 1, y - 1], [x, y], [x + 1, y + 1]];
        else px = [[x - 1, y - 1], [x, y], [x - 1, y + 1]];
        for (const [a, b] of px) ctx.fillRect(a, b, 1, 1);
      });
    }
    function paintCat(ctx, f, bk, w, h) {
      ctx.clearRect(0, 0, w, h);
      if (!f || !f.cv) return;
      if (bk === 2 && !f.src) {
        const hb = Math.min(h - 1, f.top + 9);
        ctx.drawImage(f.cv, 0, hb, w, h - hb, 0, hb, w, h - hb);
        ctx.drawImage(f.cv, 0, 0, w, hb, 0, 1, w, hb);
      } else ctx.drawImage(f.cv, 0, 0);
      if (bk) drawBonkEyes(ctx, f, bk === 2 && !f.src ? 1 : 0);
    }
    function bonkStage(cat, now) {
      if (!(now < cat.bonkUntil)) return 0;
      return now - cat.bonkT0 < 260 ? 2 : 1;
    }
    function headOf(cat) {
      if (cat._hangOn && cat.act && cat.act.type === "hang" && cat.act.hl != null) {
        const hx = cat.dir < 0 ? 20 - 7.5 : 7.5;
        return { x: cat.act.hl + hx * S, y: cat.act.ht + 10.5 * S, r: 6.5 * S, top: cat.act.ht };
      }
      const f = cat.cur;
      if (!f) return null;
      const hx = cat.dir < 0 ? W - (f.cx + 0.5) : f.cx + 0.5;
      const top = floorY - cat.y - (H - f.top) * S;
      return { x: cat.x + hx * S, y: top + 4.5 * S, r: 6.5 * S, top };
    }
    function collideHeads(now) {
      if (ball.state !== "loose") return;
      for (const c of cats) {
        if (c.hidden || !c.cur || now < (c.catchCd || 0) || c.el.style.visibility === "hidden") continue;
        const hd = headOf(c);
        if (!hd) continue;
        const dx = ball.x - hd.x, dy = ball.y - hd.y;
        const dist = Math.hypot(dx, dy), R = BR + hd.r;
        if (dist >= R || dist < 0.01) continue;
        const nx = dx / dist, ny = dy / dist;
        const vn = ball.vx * nx + ball.vy * ny;
        if (vn > -BONK_MIN_V) continue;
        const e = 0.62;
        const tx = -ny, ty = nx, vt = ball.vx * tx + ball.vy * ty;
        ball.vx = -e * vn * nx + vt * 0.85 * tx;
        ball.vy = -e * vn * ny + vt * 0.85 * ty;
        ball.x = hd.x + nx * (R + 0.5); ball.y = hd.y + ny * (R + 0.5);
        ball.squashAt = now;
        bonk(c, now, -vn);
      }
    }
    function bonk(cat, now) {
      if (cat.hidden || now < (cat.bonkCd || 0)) return false;
      cat.bonkCd = now + BONK_CD;
      cat.bonkT0 = now;
      cat.bonkUntil = now + rand(650, 850);
      hideBubble(cat, now);
      cat.nextBubble = Math.max(cat.nextBubble || 0, cat.bonkUntil + 300);
      const a = cat.act;
      const faceOnly = !a || a.type === "hang" || a.type === "bite" || a.type === "love" || a.type === "jump" || a.type === "carry" || (soc && soc.kind === "love") || a.tapped || cat.pendingTap || cat.y >= 0.5;
      if (!faceOnly && BONK_OK[a.type]) {
        if (inSoc(cat)) endSoc(now);
        if (ball.carrier === cat) dropBall(cat, now);
        const sideF = !!(cat.cur && cat.cur.side);
        setAct(cat, { type: "bonk", dur: cat.bonkUntil - now, sideF }, now);
        const r = Math.random();
        if (r < 0.3 && ball.state === "loose") {
          cat.queue.push({ type: "sit", dur: rand(250, 450) });
          cat.ballUntil = now + rand(5000, 10000);
        } else if (r < 0.65) {
          cat.ballUntil = 0;
          cat.queue.push({ type: sideF ? "loaf" : "sit", dur: rand(800, 1300) });
          cat.queue.push({ type: sideF ? "loaf" : "sit", dur: rand(900, 1500), flip: true });
        } else {
          cat.ballUntil = 0;
          cat.queue.push({ type: sideF ? "loaf" : "sit", dur: rand(1400, 2400) });
        }
      }
      return true;
    }
    const SWEAT_SVG = '<svg viewBox="0 0 5 7" aria-hidden="true"><rect x="2" y="0" width="1" height="1" fill="#7cc7ff"/><rect x="1" y="1" width="3" height="2" fill="#7cc7ff"/><rect x="0" y="3" width="5" height="3" fill="#7cc7ff"/><rect x="1" y="6" width="3" height="1" fill="#7cc7ff"/><rect x="1" y="3" width="1" height="1" fill="#e9f7ff"/></svg>';
    function renderBonkFx(cat, now) {
      if (!cat.bonkFx) {
        const el = document.createElement("div");
        el.className = "cat-bonk";
        el.innerHTML = '<i class="bk-star">' + iconSVG("sparkle") + '</i><i class="bk-sweat">' + SWEAT_SVG + "</i>";
        cat.el.appendChild(el);
        cat.bonkFx = el;
      }
      const el = cat.bonkFx;
      const on = now < cat.bonkUntil && !cat.hidden;
      if (!on) { if (el.style.display !== "none") el.style.display = "none"; cat.bonkFxT = 0; return; }
      const hd = headOf(cat);
      if (!hd) return;
      if (cat.bonkFxT !== cat.bonkT0) {
        cat.bonkFxT = cat.bonkT0;
        el.style.display = "none"; void el.offsetWidth; el.style.display = "block";
      }
      const back = cat._hangOn ? (cat.dir < 0 ? 1 : -1) : -cat.dir;
      el.style.left = Math.round(hd.x - Math.round(cat.x)) + "px";
      el.style.bottom = Math.round(floorY - (cat._hangOn ? hd.y + 4 : hd.top)) + "px";
      el.style.setProperty("--bk", String(back));
    }
    function render(cat, now) {
      const f = frameFor(cat, now) || SPRITES[cat.name].sit[0];
      const bk = bonkStage(cat, now);
      if (f !== cat.cur || cat.dir !== cat.curDir || bk !== cat._bk) {
        paintCat(cat.ctx, f, bk, W, H);
        cat._bk = bk;
        cat.cv.style.transform = cat.dir < 0 ? "scaleX(-1)" : "";
        cat.cur = f;
        cat.curDir = cat.dir;
        /* 泡泡放在頭上，並保持在聊天室內 */
        const ax = cat.dir < 0 ? (W - 1 - f.cx) : f.cx;
        cat.bubble.style.bottom = ((H - f.top) * S + 8) + "px";
        cat._ax = (ax + 0.5) * S;
      }
      const x = Math.round(cat.x);
      const bx = clamp(cat._ax, 20 - x, areaW - 20 - x);
      cat.bubble.style.left = bx + "px";
      cat.el.style.transform = "translate3d(" + x + "px,0,0)";
      if (renderHang(cat)) return;
      cat.body.style.transform = "translate3d(0," + (-Math.round(cat.y)) + "px,0)";
      const lift = clamp(cat.y / 60, 0, 1);
      cat.shadow.style.transform = "scale(" + (1 - lift * 0.45) + ")";
      cat.shadow.style.opacity = String(1 - lift * 0.5);
      if (cat.act.type === "sleep") cat.shadow.style.left = (cat.dir < 0 ? 6 : 8) * S + "px";
      else cat.shadow.style.left = 7 * S + "px";
    }

    /* =====================================================================
       咬泡泡：貓偶爾走到訊息泡泡旁邊，咬住邊邊、往後甩頭拉幾下；
       泡泡被拉得稍微變形，鬆口後像果凍一樣彈回原狀（只用暫時的 transform，形狀不變）
       ===================================================================== */
    const msgMenuEl = document.getElementById("msgMenu");
    const warpLayer = document.createElement("div");
    warpLayer.className = "pet-warp";
    warpLayer.setAttribute("aria-hidden", "true");
    chat.insertBefore(warpLayer, inputBar);
    const frontWrap = document.createElement("div");
    frontWrap.className = "cat-front";
    frontWrap.setAttribute("aria-hidden", "true");
    const frontCv = document.createElement("canvas");
    frontCv.width = W; frontCv.height = H;
    frontWrap.appendChild(frontCv);
    chat.insertBefore(frontWrap, inputBar);
    const frontCtx = frontCv.getContext("2d");
    frontCtx.imageSmoothingEnabled = false;
    const HEAD_COL = 19; /* 頭從這一欄開始（朝右的影格） */
    const jellies = [];
    let nextBiteAt = now0 + rand(7000, 12000);
    let forceWatch = null; /* 測試用：true 一定來看、false 不來、"join" 來看並撲上去 */

    /* 影格上的咬住點，換算成聊天室座標 */
    function contactPt(cat, f) {
      const p = f.bitePt || BITE_PT[1];
      const px = cat.dir < 0 ? W - p.x : p.x;
      return { x: Math.round(cat.x) + px * S, y: floorY - cat.y - (H - p.y) * S };
    }
    function bubOK(el) {
      if (!el || !el.isConnected || el.classList.contains("ghost") || el.classList.contains("holding") || el.classList.contains("droop") || everDrooped(el)) return false;
      const row = el.closest(".row");
      return !!row && !row.classList.contains("shattering") && !row.classList.contains("gone");
    }
    /* 咬得到的泡泡：貼近地板、嘴巴的高度剛好在泡泡側邊上 */
    function biteTarget(cat, s) {
      if (!bubOK(s.el)) return null;
      const clip = bubbleShapes.lastClip;
      if (clip && (s.y < clip.y - 1 || s.y + s.h > clip.y + clip.h + 2)) return null;
      const you = !s.el.closest(".row.me");
      const side = you ? 1 : -1; /* 1：咬右邊（貓站在右邊、臉朝左） */
      const dir = -side;
      const c1 = BITE_PT[1];
      const my = floorY - (H - c1.y) * S;
      const ly = my - s.y;
      if (ly < 7 || ly > s.h - 6) return null;
      const rt = side > 0 ? s.r.tr : s.r.tl, rb = side > 0 ? s.r.br : s.r.bl;
      let inset = 0;
      if (ly < rt) { const d = rt - ly; inset = rt - Math.sqrt(Math.max(0, rt * rt - d * d)); }
      else if (ly > s.h - rb) { const d = ly - (s.h - rb); inset = rb - Math.sqrt(Math.max(0, rb * rb - d * d)); }
      if (inset > 5) return null;
      const edgeX = side > 0 ? s.x + s.w - inset : s.x + inset;
      const cx = edgeX - side * 1.5; /* 牙齒稍微咬進泡泡邊 */
      const standX = dir > 0 ? cx - c1.x * S : cx - (W - c1.x) * S;
      if (standX < minX() - 1 || standX > maxX() + 1) return null;
      return { el: s.el, side, dir, standX: clamp(standX, minX(), maxX()), edgeX, ly };
    }
    function biteTargets(cat) {
      const shapes = bubbleShapes();
      bubbleShapes.lastClip = shapes.clip;
      const out = [];
      if (!msgMenuEl.hidden) return out;
      for (const s of shapes) {
        if (jellies.some((j) => j.el === s.el)) continue;
        const t = biteTarget(cat, s);
        if (t) out.push(t);
      }
      out.sort((p, q) => Math.abs(p.standX - cat.x) - Math.abs(q.standX - cat.x));
      return out;
    }
    function canBite(c, now, watcher) {
      const a = c.act;
      if (c.hidden || inSoc(c) || ballBusy(c, now) || c.pendingTap || !a) return false;
      if (a.tapped || a.type === "jump" || a.type === "stun" || a.type === "bite" || a.type === "hang" || a.watch) return false;
      /* 一次只會有一隻在咬泡泡 */
      if (biteBusy(c) || (!watcher && cats.some((o) => o !== c && biteBusy(o)))) return false;
      if (a.type === "sleep" && Math.random() > 0.2) return false;
      return true;
    }
    function goBite(cat, t, now, instant) {
      cat.queue = [];
      const act = { type: "bite", el: t.el, side: t.side, face: t.dir, bdir: t.dir };
      if (instant || Math.abs(cat.x - t.standX) < 2) {
        cat.x = t.standX;
        setAct(cat, act, now);
      } else {
        setAct(cat, moveAct(Math.abs(cat.x - t.standX) > 150 ? "run" : "walk", t.standX, Math.abs(cat.x - t.standX) > 150 ? rand(110, 130) : rand(48, 60)), now);
        cat.queue.push(act);
      }
      if (Math.random() < 0.5) say(cat, pick(["bang", "sparkle", "question"]), now);
      nextSocialAt = Math.max(nextSocialAt, now + 6000);
    }
    /* 一次咬泡泡的節奏：站好 → 張嘴 → 咬住 → 甩頭拉 2–4 下 → 鬆口 → 看一下 */
    function biteSeq(maxSc) {
      const seq = [{ fi: -1, d: 160 }, { fi: 0, d: rand(150, 220), front: true }, { fi: 1, d: rand(260, 380), ev: "attach", front: true }];
      const n = Math.random() < 0.3 ? 4 : 3;
      const top = Math.max(0, Math.min(maxSc, Math.round(rand(5, 7))));
      let sc = 0;
      for (let j = 0; j < n; j++) {
        const last = j === n - 1;
        /* 每甩一下就用力往後拖一點（腳撐著地），泡泡越拉越長 */
        const sc2 = last ? top : Math.min(top, Math.round(top * (j + 1) / n + rand(-0.4, 0.4)));
        seq.push({ fi: 2, d: rand(50, 70), sc, front: true });
        if (Math.random() < 0.4) { /* 甩頭甩兩下 */
          for (let k = 0; k < 3; k++) { seq.push({ fi: 3, d: rand(70, 90), sc: sc2, front: true }); seq.push({ fi: 2, d: 60, sc: sc2, front: true }); }
          seq.push({ fi: 3, d: rand(140, 200), sc: sc2, front: true });
        } else seq.push({ fi: 3, d: rand(260, 360), sc: sc2, front: true });
        sc = sc2;
        if (last) {
          /* 最後一下拉到最緊時鬆口：泡泡啪一下彈回去，像果凍一樣晃 */
          seq.push({ fi: 3, d: rand(90, 140), sc, ev: "release" });
          seq.push({ fi: 2, d: 90, sc });
          break;
        }
        seq.push({ fi: 2, d: rand(70, 100), sc, front: true });
        seq.push({ fi: 1, d: rand(200, 360), sc, front: true });
      }
      seq.push({ fi: -1, d: rand(650, 1000), sc, ev: "after" });
      return seq;
    }
    function startBiteAct(cat, a, now) {
      const room = a.bdir > 0 ? (cat.x - minX()) : (maxX() - cat.x);
      a.seq = biteSeq(Math.floor(Math.max(0, room) / S));
      a.si = 0;
      a.sEnd = now + a.seq[0].d;
      a.fi = a.seq[0].fi;
      a.baseX = cat.x;
      a.rect0 = null;
    }
    function abortBite(cat, now) {
      const a = cat.act;
      if (a && a.type === "bite") { a.dead = true; cat.queue = []; finish(cat, now); }
    }
    function biteStep(cat, a, now) {
      if (!a.seq) startBiteAct(cat, a, now);
      cat.dir = a.bdir;
      /* 泡泡被刪掉、被按住、選單打開、或捲走了：鬆口 */
      const r = bubOK(a.el) ? layoutRect(a.el) : null;
      if (!r || !msgMenuEl.hidden) { abortBite(cat, now); return; }
      if (!a.rect0) a.rect0 = r;
      else if (Math.abs(r.top - a.rect0.top) > 6 || Math.abs(r.left - a.rect0.left) > 6 || Math.abs(r.width - a.rect0.width) > 4) { abortBite(cat, now); return; }
      while (now >= a.sEnd) {
        a.si++;
        if (a.si >= a.seq.length) { a.done = true; finish(cat, now); return; }
        const st = a.seq[a.si];
        a.sEnd += st.d;
        if (st.ev === "attach") attachJelly(cat, a, now);
        else if (st.ev === "release") { const j = jellies.find((q) => q.act === a); if (j) releaseJelly(j, now); }
        else if (st.ev === "after") { say(cat, pick(["sparkle", "note", "heart", "question"]), now, 0.6); }
      }
      const st = a.seq[a.si];
      a.fi = st.fi;
      a.front = !!st.front;
      cat.x = a.baseX - a.bdir * (st.sc || 0) * S;
      /* 有另一隻在旁邊看：偶爾忍不住撲過來，一起玩起來 */
      if (a.joiner && now > a.joinAt && !soc) {
        const o = a.joiner;
        a.joiner = null;
        if (o.act && o.act.watch && !o.hidden) { startChase(o, cat, now, { wait: rand(80, 160) }); }
      }
    }

    /* ----- 果凍泡泡：把泡泡拍成一張圖，用網格扭曲畫出「被咬住的那一點被拉尖、拉長」；
       被咬著時咬住點永遠在貓嘴裡，鬆口後阻尼彈簧晃幾下回到原狀 ----- */
    const JPAD_X = 46, JPAD_Y = 18, JCOLS = 22, JROWS = 6;
    const HPAD_X = 30, HPAD_T = 4, HPAD_B = 26; /* 吊著拉：只往下長 */
    function snapBubble(el, r) {
      const dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 2));
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.ceil(r.width * dpr)); cv.height = Math.max(1, Math.ceil(r.height * dpr));
      const c = cv.getContext("2d");
      c.scale(dpr, dpr);
      const cs = getComputedStyle(el);
      bubblePath(c, r.width, r.height, radiiFor(el));
      c.fillStyle = cs.backgroundColor;
      c.fill();
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode, text = node.nodeValue;
        if (!text) continue;
        const pcs = getComputedStyle(node.parentElement);
        c.fillStyle = pcs.color; c.font = pcs.font; c.textBaseline = "middle";
        c.globalAlpha = Math.max(0.001, parseFloat(pcs.opacity) || 1);
        for (let i = 0; i < text.length; i++) {
          if (text[i] === "\n") continue;
          const rg = document.createRange(); rg.setStart(node, i); rg.setEnd(node, i + 1);
          const b = rg.getBoundingClientRect();
          if (b.width < 0.2) continue;
          c.fillText(text[i], b.left - r.left, b.top - r.top + b.height / 2);
        }
        c.globalAlpha = 1;
      }
      return { cv, dpr };
    }
    function attachJelly(cat, a, now) {
      if (!bubOK(a.el)) return;
      const f = SPRITES[cat.name].bite[1];
      const A = contactPt(cat, f);
      const r = layoutRect(a.el);
      for (const q of jellies.slice()) if (q.el === a.el) resetJelly(q);
      const snap = snapBubble(a.el, r);
      const cv = document.createElement("canvas");
      cv.className = "bub-warp";
      cv.setAttribute("aria-hidden", "true");
      const dpr = snap.dpr;
      cv.width = Math.ceil((r.width + JPAD_X * 2) * dpr); cv.height = Math.ceil((r.height + JPAD_Y * 2) * dpr);
      cv.style.width = r.width + JPAD_X * 2 + "px"; cv.style.height = r.height + JPAD_Y * 2 + "px";
      cv.style.left = "0px"; cv.style.top = "0px";
      warpLayer.appendChild(cv);
      a.el.classList.add("jelly");
      /* 咬住點（泡泡自己的座標）：泡泡邊上、嘴巴的高度 */
      const bx = a.side > 0 ? r.width : 0;
      const by = clamp(A.y - (r.top - chatR.top), 4, r.height - 4);
      const j = { el: a.el, cv, snap, cat, act: a, side: a.side, A, w: r.width, h: r.height, bx, by, ox: 0, oy: 0, vx: 0, vy: 0, held: true, t0: now, relAt: 0 };
      jellies.push(j);
      a.el._jelly = j;
      maybeWatch(cat, a, now);
      placeWarp(j);
      drawJelly(j);
    }
    function releaseJelly(j, now) {
      if (!j.held) return;
      j.held = false;
      j.relAt = now;
    }
    function resetJelly(j) {
      const i = jellies.indexOf(j);
      if (i >= 0) jellies.splice(i, 1);
      if (j.cv && j.cv.parentNode) j.cv.remove();
      if (j.el) { j.el.classList.remove("jelly"); if (j.el._jelly === j) delete j.el._jelly; }
    }
    /* 泡泡上一點 (x,y) 被拉之後跑到哪：遠的那一邊不動，越靠近咬住點跟著嘴巴走越多，中間被拉細 */
    function warpPt(j, x, y) {
      if (j.mode === "bottom") {
        /* 底邊被咬著往下拉：上緣不動，越靠近咬住點被拉越多，拉成尖尖的、兩側往嘴巴收 */
        const fy = Math.pow(clamp(y / j.h, 0, 1), 2.1);
        const dx = (x - j.bx) / Math.max(26, j.w * 0.24);
        const pull = j.oy;
        const g = Math.exp(-dx * dx);
        const gx = pull >= 0 ? 0.08 + 0.92 * g : 1;
        const k = clamp(pull / j.h, -0.2, 0.45) * fy * g * 0.9;
        return { x: x + (j.bx - x) * k + j.ox * fy * gx, y: y + pull * fy * gx };
      }
      const u = j.side > 0 ? x / j.w : 1 - x / j.w;
      const fx = Math.pow(clamp(u, 0, 1), 2.1);
      const dy = (y - j.by) / (j.h * 0.42);
      const pull = j.ox * j.side; /* 往貓那邊拉是正的 */
      let gy;
      if (pull >= 0) gy = 0.22 + 0.78 * Math.exp(-dy * dy); /* 被咬的地方拉成尖尖的 */
      else gy = 1; /* 彈回來壓扁：整邊一起 */
      const k = clamp(pull / j.w, -0.18, 0.3) * fx * 1.25; /* 拉長時變細，壓扁時變胖 */
      return { x: x + j.ox * fx * gy, y: y + j.oy * fx * gy + (j.by - y) * k };
    }
    function drawJelly(j) {
      const cv = j.cv, c = cv.getContext("2d"), dpr = j.snap.dpr, img = j.snap.cv;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cv.width, cv.height);
      const P = [];
      for (let r = 0; r <= JROWS; r++) {
        const row = [];
        for (let q = 0; q <= JCOLS; q++) {
          const sx = j.w * q / JCOLS, sy = j.h * r / JROWS;
          const d = warpPt(j, sx, sy);
          row.push({ sx, sy, x: d.x + (j.padX != null ? j.padX : JPAD_X), y: d.y + (j.padT != null ? j.padT : JPAD_Y) });
        }
        P.push(row);
      }
      const tri = (a, b, e) => {
        /* 把來源三角形（泡泡圖）貼到扭曲後的三角形 */
        const x0 = a.sx * dpr, y0 = a.sy * dpr, x1 = b.sx * dpr, y1 = b.sy * dpr, x2 = e.sx * dpr, y2 = e.sy * dpr;
        const X0 = a.x * dpr, Y0 = a.y * dpr, X1 = b.x * dpr, Y1 = b.y * dpr, X2 = e.x * dpr, Y2 = e.y * dpr;
        const den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
        if (Math.abs(den) < 1e-6) return;
        const m11 = ((X1 - X0) * (y2 - y0) - (X2 - X0) * (y1 - y0)) / den;
        const m12 = ((Y1 - Y0) * (y2 - y0) - (Y2 - Y0) * (y1 - y0)) / den;
        const m21 = ((X2 - X0) * (x1 - x0) - (X1 - X0) * (x2 - x0)) / den;
        const m22 = ((Y2 - Y0) * (x1 - x0) - (Y1 - Y0) * (x2 - x0)) / den;
        const dx = X0 - m11 * x0 - m21 * y0, dy = Y0 - m12 * x0 - m22 * y0;
        const cx = (X0 + X1 + X2) / 3, cy = (Y0 + Y1 + Y2) / 3, g = 0.9; /* 稍微放大一點，接縫不會露出細線 */
        const ex = (X, Y) => { const l = Math.hypot(X - cx, Y - cy) || 1; return [X + (X - cx) / l * g, Y + (Y - cy) / l * g]; };
        c.save();
        c.beginPath();
        c.moveTo(...ex(X0, Y0)); c.lineTo(...ex(X1, Y1)); c.lineTo(...ex(X2, Y2)); c.closePath();
        c.clip();
        c.setTransform(m11, m12, m21, m22, dx, dy);
        c.drawImage(img, 0, 0);
        c.restore();
      };
      for (let r = 0; r < JROWS; r++) for (let q = 0; q < JCOLS; q++) {
        const a = P[r][q], b = P[r][q + 1], e = P[r + 1][q], f = P[r + 1][q + 1];
        tri(a, b, f); tri(a, f, e);
      }
    }
    function placeWarp(j) {
      const r = layoutRect(j.el);
      const padX = j.padX != null ? j.padX : JPAD_X;
      const padT = j.padT != null ? j.padT : JPAD_Y;
      j.cv.style.left = (r.left - chatR.left - padX) + "px";
      j.cv.style.top = (r.top - chatR.top - padT) + "px";
    }
    function jellyStep(now, dt) {
      for (const j of jellies.slice()) {
        if (!bubOK(j.el) || j.el.classList.contains("holding")) { resetJelly(j); continue; }
        if (j.held && (j.cat.act !== j.act || !msgMenuEl.hidden)) releaseJelly(j, now);
        if (j.held && j.mode === "bottom") {
          const ty = j.act.phase === "hang" ? (j.act.D || 0) : 0;
          if (dt > 0) j.vy = j.vy * 0.5 + 0.5 * (ty - j.oy) / dt;
          j.oy = ty; j.ox = 0; j.vx = 0;
        } else if (j.held) {
          /* 咬住點一直在嘴裡：直接跟著嘴巴 */
          const f = j.cat.cur && j.cat.cur.bitePt ? j.cat.cur : SPRITES[j.cat.name].bite[1];
          const P = contactPt(j.cat, f);
          const tx = clamp(P.x - j.A.x, -40, 40), ty = clamp(P.y - j.A.y, -16, 16);
          if (dt > 0) { j.vx = j.vx * 0.5 + 0.5 * (tx - j.ox) / dt; j.vy = j.vy * 0.5 + 0.5 * (ty - j.oy) / dt; }
          j.ox = tx; j.oy = ty;
        } else {
          /* 鬆口：果凍彈回來，衝過頭再晃兩三下，大約 1 秒停下 */
          const w0 = 24, z = 0.13;
          const n = Math.max(1, Math.ceil(dt * 480));
          const h = dt / n;
          for (let i = 0; i < n; i++) {
            j.vx += (-w0 * w0 * j.ox - 2 * z * w0 * j.vx) * h;
            j.vy += (-w0 * w0 * j.oy - 2 * z * w0 * j.vy) * h;
            j.ox += j.vx * h; j.oy += j.vy * h;
          }
          if ((now - j.relAt > 250 && Math.abs(j.ox) < 0.2 && Math.abs(j.oy) < 0.2 && Math.abs(j.vx) < 3 && Math.abs(j.vy) < 3) || now - j.relAt > 2500) { resetJelly(j); continue; }
        }
        placeWarp(j);
        drawJelly(j);
      }
    }
    msgList.addEventListener("bub-droop", (e) => {
      const el = e.target;
      const n = performance.now();
      const row = el.closest && el.closest(".row");
      if (row && row.dataset.k) droopedKeys.add(row.dataset.k);
      for (const c of cats) c.queue = c.queue.filter((q) => !q.el || q.el !== el); /* 正要走過去咬／吊它的也取消 */
      for (const c of cats) if (c.act && c.act.type === "bite" && c.act.el === el) abortBite(c, n);
      for (const c of cats) if (c.act && c.act.type === "hang" && c.act.el === el) hangDrop(c, c.act, n);
      for (const j of jellies.slice()) if (j.el === el) resetJelly(j);
    });
    msgList.addEventListener("bub-shatter", (e) => {
      const el = e.target;
      const n = performance.now();
      for (const c of cats) if (c.act && c.act.type === "bite" && c.act.el === el) abortBite(c, n);
      for (const c of cats) if (c.act && c.act.type === "hang" && c.act.el === el) hangDrop(c, c.act, n);
      for (const j of jellies.slice()) if (j.el === el) resetJelly(j);
      if (soc && soc.kind === "love") endSoc(n); /* 刪訊息／清除：談戀愛中斷 */
    });

    /* ----- 咬著的貓：頭畫在泡泡前面 ----- */
    function renderFront() {
      for (const k of cats) if (k.hangFront && !k._hangOn && k.hangFront.style.display !== "none") k.hangFront.style.display = "none";
      let c = null;
      for (const k of cats) if (!k.hidden && k.act && k.act.type === "bite" && k.act.front && k.cur) c = k;
      if (!c) { if (frontCv.style.display !== "none") frontCv.style.display = "none"; return; }
      frontCtx.clearRect(0, 0, W, H);
      frontCtx.drawImage(c.cur.cv, HEAD_COL, 0, W - HEAD_COL, H, HEAD_COL, 0, W - HEAD_COL, H);
      frontCv.style.display = "block";
      frontCv.style.width = W * S + "px";
      frontCv.style.height = H * S + "px";
      frontCv.style.transform = "translate3d(" + Math.round(c.x) + "px," + (-Math.round(c.y)) + "px,0)" + (c.dir < 0 ? " scaleX(-1)" : "");
    }

    /* ----- 另一隻：有時候過來看，偶爾撲上去一起玩 ----- */
    function maybeWatch(biter, a, now) {
      const o = other(biter);
      const fw = forceWatch; forceWatch = null;
      if (fw === false || (fw == null && Math.random() > 0.5) || !canBite(o, now, true)) return;
      const spot = biter.x - a.bdir * GAP() * rand(1.0, 1.3);
      if (spot < minX() || spot > maxX()) return;
      o.queue = [];
      setAct(o, moveAct("walk", spot, rand(50, 64)), now);
      o.queue.push({ type: "sit", dur: rand(2200, 3600), face: a.bdir, watch: true });
      setTimeout(() => { if (o.act && o.act.watch) say(o, pick(["question", "sparkle", "note"]), performance.now(), 0.8); }, 900);
      if (fw === "join" || (fw == null && Math.random() < 0.3)) { a.joiner = o; a.joinAt = now + rand(1900, 2800); }
    }

    /* ----- 什麼時候咬：沒在玩的時候偶爾一次（大約 20–40 秒） ----- */
    function biteSchedule(now) {
      if (now < nextBiteAt) return;
      nextBiteAt = now + rand(2500, 4000);
      if (soc || ball.state === "drag" || ball.state === "carried") return;
      for (const c of (Math.random() < 0.5 ? [cats[0], cats[1]] : [cats[1], cats[0]])) {
        if (!canBite(c, now)) continue;
        const ts = biteTargets(c);
        const hs = hangTargets(c);
        if (!ts.length && !hs.length) continue;
        /* 地上咬邊邊、跳上去吊著，兩種都會 */
        if (hs.length && (!ts.length || Math.random() < 0.45)) goHang(c, Math.random() < 0.75 ? hs[0] : pick(hs), now, false);
        else goBite(c, Math.random() < 0.75 ? ts[0] : pick(ts), now, false);
        nextBiteAt = now + rand(10000, 20000);
        return;
      }
    }
    function debugBite(i, o) {
      const n = performance.now();
      const c = cats[i || 0];
      if (soc) endSoc(n);
      for (const k of cats) if (k !== c) stopBite(k, n);
      c.ballUntil = 0;
      if (ball.carrier === c) dropBall(c, n);
      if (c.hidden) return false;
      const ts = biteTargets(c);
      if (!ts.length) return false;
      goBite(c, ts[0], n, !!o.now);
      forceWatch = o.watch === undefined ? null : o.watch;
      nextBiteAt = n + rand(20000, 40000);
      return ts[0].el.textContent;
    }

    /* =====================================================================
       跳起來咬泡泡底邊：跑到泡泡下面 → 蹲一下 → 跳上去咬住泡泡下緣 → 吊在上面四隻腳亂踢；
       泡泡被往下拉尖、跟著貓晃；泡泡往上移（捲動／新訊息）貓跟著上去；
       3–6 秒後鬆口掉下來，落地蹲一下，泡泡像果凍一樣彈回原狀
       ===================================================================== */
    const HANG_W = 20, HANG_H = 32;
    const J1M = SPRITES.gray.jump[1].mouth;
    const HANG_D0 = 13, HANG_DMAX = 19; /* 吊著時泡泡被往下拉多少（px） */
    function hangLen(f) { return (HANG_H - f.pt.y) * S; }
    function hangMinH() { return Math.max(...SPRITES.gray.hang.map(hangLen)) + HANG_DMAX + 3; }
    function hangMaxH() { return 155; }
    function ensureHangCv(cat) {
      if (cat.hangCv) return;
      const cv = document.createElement("canvas");
      cv.className = "cat-hang"; cv.width = HANG_W; cv.height = HANG_H;
      cat.el.appendChild(cv);
      const fc = document.createElement("canvas");
      fc.width = HANG_W; fc.height = HANG_H;
      frontWrap.appendChild(fc);
      cat.hangCv = cv; cat.hangCtx = cv.getContext("2d");
      cat.hangFront = fc; cat.hangFrontCtx = fc.getContext("2d");
      cat.hangCtx.imageSmoothingEnabled = false; cat.hangFrontCtx.imageSmoothingEnabled = false;
    }
    /* 吊得到的泡泡：畫面上從下面數來前三則、下緣離地板的高度剛好、嘴巴咬在下緣中間那段 */
    function hangTargets(cat) {
      if (!msgMenuEl.hidden) return [];
      const shapes = bubbleShapes();
      const clip = shapes.clip;
      const vis = shapes.filter((s) => bubOK(s.el) && s.y >= clip.y - 1 && s.y + s.h <= clip.y + clip.h + 1)
        .sort((p, q) => (q.y + q.h) - (p.y + p.h));
      const out = [];
      const all = msgList.querySelectorAll(".row:not(.shattering):not(.gone) .bub:not(.ghost)");
      const lastBub = all[all.length - 1];
      vis.slice(0, 3).forEach((s, rank) => {
        if (jellies.some((j) => j.el === s.el) || s.el === lastBub) return;
        const hgt = floorY - (s.y + s.h);
        if (hgt < hangMinH() || hgt > hangMaxH() || s.w < 46) return;
        const m = Math.max(22, s.w * 0.33);
        const lo = s.x + m, hi = s.x + s.w - m;
        if (hi < lo) return;
        const opts = [];
        for (const dir of [1, -1]) {
          const off = (dir > 0 ? J1M.x : W - J1M.x) * S;
          const a = Math.max(lo, minX() + off), b = Math.min(hi, maxX() + off);
          if (b < a) continue;
          const mx = clamp(s.cx, a, b);
          opts.push({ dir, mx, standX: mx - off });
        }
        if (!opts.length) return;
        /* 優先：順著走過去的方向（不用轉身） */
        opts.sort((p, q) => ((q.standX - cat.x) * q.dir > 0) - ((p.standX - cat.x) * p.dir > 0));
        const o = opts[0];
        out.push({ el: s.el, rank, dir: o.dir, mx: o.mx, standX: o.standX, relX: o.mx - s.x, kind: "hang" });
      });
      out.sort((p, q) => Math.abs(p.standX - cat.x) - Math.abs(q.standX - cat.x));
      return out;
    }
    function goHang(cat, t, now, instant, dur) {
      cat.queue = [];
      const act = { type: "hang", el: t.el, relX: t.relX, face: t.dir, hdir: t.dir, bdir: t.dir, forceDur: dur };
      const far = Math.abs(cat.x - t.standX);
      if (instant || far < 2) { cat.x = t.standX; setAct(cat, act, now); }
      else {
        setAct(cat, moveAct(far > 110 ? "run" : "walk", t.standX, far > 110 ? rand(120, 140) : rand(52, 64)), now);
        cat.queue.push(act);
      }
      if (Math.random() < 0.5) say(cat, pick(["bang", "sparkle"]), now);
      nextSocialAt = Math.max(nextSocialAt, now + 9000);
    }
    function hangPhase(a, p, now) { a.phase = p; a.pt0 = now; }
    function hangRect(a) {
      const r = bubOK(a.el) ? layoutRect(a.el) : null;
      if (!r || !msgMenuEl.hidden) return null;
      const sr = scrollEl.getBoundingClientRect();
      if (r.bottom > sr.bottom + 1 || r.top < sr.top - 1) return null; /* 捲出畫面：掉下來 */
      return r;
    }
    function hangDrop(cat, a, now) {
      if (a.phase === "fall" || a.phase === "land" || a.phase === "sit") return;
      const j = jellies.find((q) => q.act === a);
      if (j) releaseJelly(j, now);
      if (a.phase === "crouch") { hangPhase(a, "land", now); return; }
      if (a.phase === "hang" && a.mouth) {
        /* 換回側面的身體：腳的高度接著吊著時的腳 */
        const f = SPRITES[cat.name].hang[a.fi];
        cat.y = Math.max(0, floorY - (a.mouth.y + hangLen(f)));
      }
      a.vy = 0;
      hangPhase(a, "fall", now);
    }
    function hangStep(cat, a, now, dt) {
      cat.dir = a.hdir;
      if (!a.phase) { hangPhase(a, "crouch", now); cat.y = 0; }
      const pe = now - a.pt0;
      const live = a.phase === "crouch" || a.phase === "rise" || a.phase === "hang";
      if (live) {
        const r = hangRect(a);
        if (!r || a.drop) { hangDrop(cat, a, now); }
        else {
          a.r = r;
          a.P = { x: r.left - chatR.left + a.relX, y: r.bottom - chatR.top };
          const want = a.P.x - (a.hdir > 0 ? J1M.x : W - J1M.x) * S;
          /* 泡泡左右跑掉太多（版面改變）：放棄 */
          if (Math.abs(want - cat.x) > 14) hangDrop(cat, a, now);
        }
      }
      if (a.phase === "crouch") {
        cat.y = 0;
        if (pe > 130) hangPhase(a, "rise", now);
      }
      if (a.phase === "rise") {
        const p = clamp((now - a.pt0) / 250, 0, 1);
        const yEnd = floorY - a.P.y - (H - J1M.y) * S;
        cat.y = yEnd * (1 - (1 - p) * (1 - p));
        if (p >= 1) {
          hangPhase(a, "hang", now);
          a.D = 0; a.vD = 190; a.fi = 0; a.nextFi = now + 100;
          a.dur = a.forceDur || rand(3000, 6000);
          a.mouth = { x: a.P.x, y: a.P.y };
          hideBubble(cat, now);
          cat.nextBubble = now + 1e9;
          attachHangJelly(cat, a, now);
        }
        return;
      }
      if (a.phase === "hang") {
        cat.y = 0;
        if (now >= a.nextFi) {
          /* 四隻腳亂踢：換影格，身體也跟著上下彈一下 */
          a.fi = (a.fi + (Math.random() < 0.3 ? 2 : 1)) % 4;
          a.nextFi = now + rand(85, 135);
          a.vD += rand(-30, 55);
        }
        const w = 15, z = 0.32;
        const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
        for (let i = 0; i < n; i++) { a.vD += (-w * w * (a.D - HANG_D0) - 2 * z * w * a.vD) * h; a.D += a.vD * h; }
        if (a.D > HANG_DMAX) { a.D = HANG_DMAX; a.vD = Math.min(0, a.vD); }
        if (a.D < -2) { a.D = -2; a.vD = Math.max(0, a.vD); }
        a.mouth = { x: a.P.x, y: a.P.y + a.D };
        const f = SPRITES[cat.name].hang[a.fi];
        if (floorY - (a.mouth.y + hangLen(f)) < 1) { hangDrop(cat, a, now); } /* 泡泡往下移到腳碰地：放開 */
        else if (now - a.pt0 > a.dur) hangDrop(cat, a, now);
      }
      if (a.phase === "fall") {
        a.vy += 1900 * dt;
        cat.y -= a.vy * dt;
        if (cat.y <= 0) { cat.y = 0; hangPhase(a, "land", now); }
        return;
      }
      if (a.phase === "land") {
        cat.y = 0;
        if (now - a.pt0 > 170) {
          if (cat.pendingTap) { cat.pendingTap = false; hangPhase(a, "sit", now); tapSit(cat, now); return; }
          hangPhase(a, "sit", now);
          a.sitDur = rand(900, 1600);
          cat.nextBubble = now + 200;
          say(cat, pick(["sparkle", "note", "heart", "bang"]), now, 0.6);
        }
        return;
      }
      if (a.phase === "sit") {
        cat.y = 0;
        if (now - a.pt0 > a.sitDur) { a.done = true; finish(cat, now); }
      }
    }
    function attachHangJelly(cat, a, now) {
      if (!bubOK(a.el)) return;
      const r = layoutRect(a.el);
      for (const q of jellies.slice()) if (q.el === a.el) resetJelly(q);
      const snap = snapBubble(a.el, r);
      const cv = document.createElement("canvas");
      cv.className = "bub-warp";
      cv.setAttribute("aria-hidden", "true");
      const dpr = snap.dpr;
      cv.width = Math.ceil((r.width + HPAD_X * 2) * dpr); cv.height = Math.ceil((r.height + HPAD_T + HPAD_B) * dpr);
      cv.style.width = r.width + HPAD_X * 2 + "px"; cv.style.height = r.height + HPAD_T + HPAD_B + "px";
      cv.style.left = "0px"; cv.style.top = "0px";
      warpLayer.appendChild(cv);
      a.el.classList.add("jelly");
      const j = { el: a.el, cv, snap, cat, act: a, mode: "bottom", padX: HPAD_X, padT: HPAD_T, side: 0, w: r.width, h: r.height, bx: a.relX, by: r.height, ox: 0, oy: 0, vx: 0, vy: 0, held: true, t0: now, relAt: 0 };
      jellies.push(j);
      a.el._jelly = j;
      maybeWatch(cat, a, now);
      placeWarp(j);
      drawJelly(j);
    }
    /* 吊著的貓：整隻畫在直的畫布上（在泡泡後面），只有嘴巴那幾列畫在泡泡前面 */
    function renderHang(cat) {
      ensureHangCv(cat);
      const a = cat.act;
      const on = !cat.hidden && a.type === "hang" && a.phase === "hang" && !!a.mouth;
      if (on !== !!cat._hangOn) {
        cat._hangOn = on;
        cat.body.style.visibility = on ? "hidden" : "";
        cat.hangCv.style.display = on ? "block" : "none";
        cat.hangFront.style.display = on ? "block" : "none";
        cat.hangKey = null;
      }
      if (!on) return false;
      const f = SPRITES[cat.name].hang[a.fi];
      const bk = bonkStage(cat, performance.now()); /* ⚠️ 這裡沒有 now 參數：以前寫 now 會丟 ReferenceError，整個貓迴圈停掉 */
      const key = a.fi + ":" + cat.dir + ":" + bk;
      if (cat.hangKey !== key) {
        cat.hangKey = key;
        paintCat(cat.hangCtx, f, bk, HANG_W, HANG_H);
        const frn = Math.ceil(f.pt.y + 1.5);
        cat.hangFrontCtx.clearRect(0, 0, HANG_W, HANG_H);
        cat.hangFrontCtx.drawImage(cat.hangCv, 0, 0, HANG_W, frn, 0, 0, HANG_W, frn);
      }
      const ptx = cat.dir < 0 ? HANG_W - f.pt.x : f.pt.x;
      const left = Math.round(a.mouth.x - ptx * S), top = Math.round(a.mouth.y - f.pt.y * S);
      a.hl = left; a.ht = top;
      const x = Math.round(cat.x);
      const w = HANG_W * S + "px", h = HANG_H * S + "px";
      for (const cv of [cat.hangCv, cat.hangFront]) {
        cv.style.width = w; cv.style.height = h;
        const dx = cv === cat.hangCv ? left - x : left;
        cv.style.transform = "translate3d(" + dx + "px," + (top - (floorY - HANG_H * S)) + "px,0)" + (cat.dir < 0 ? " scaleX(-1)" : "");
      }
      /* 地上的影子：在吊著的貓正下方，離地越高越淡越小 */
      const lift = clamp((floorY - (top + HANG_H * S)) / 60, 0, 1);
      cat.shadow.style.left = (left + HANG_W * S / 2 - 9 * S - x) + "px";
      cat.shadow.style.transform = "scale(" + (1 - lift * 0.45) + ")";
      cat.shadow.style.opacity = String(1 - lift * 0.5);
      return true;
    }
    function hangMaskHit(c, cx, cy) {
      const r = c.hangCv.getBoundingClientRect();
      if (cx < r.left - 2 * S || cx > r.right + 2 * S || cy < r.top - 2 * S || cy > r.bottom + 2 * S) return false;
      const f = SPRITES[c.name].hang[c.act.fi];
      let px = Math.floor((cx - r.left) / S), py = Math.floor((cy - r.top) / S);
      if (c.dir < 0) px = HANG_W - 1 - px;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const X = px + dx, Y = py + dy;
        if (X >= 0 && X < HANG_W && Y >= 0 && Y < HANG_H && f.mask[Y * HANG_W + X]) return true;
      }
      return false;
    }
    function debugHang(i, o) {
      const n = performance.now();
      const c = cats[i || 0];
      if (soc) endSoc(n);
      for (const k of cats) if (k !== c) stopBite(k, n);
      c.ballUntil = 0;
      if (ball.carrier === c) dropBall(c, n);
      if (c.hidden) return false;
      const ts = hangTargets(c);
      if (!ts.length) return false;
      goHang(c, ts[0], n, !!o.now, o.dur);
      forceWatch = o.watch === undefined ? false : o.watch;
      nextBiteAt = n + rand(20000, 40000);
      return ts[0].el.textContent;
    }
    /* 別隻正在咬／吊著：先放開（測試用，確保永遠只有一隻在咬） */
    function stopBite(k, n) {
      const a = k.act;
      if (a && a.type === "bite") abortBite(k, n);
      else if (a && a.type === "hang") { hangDrop(k, a, n); }
      k.queue = k.queue.filter((q) => q.type !== "bite" && q.type !== "hang");
    }
    function biteBusy(c) {
      const a = c.act;
      if (a && (a.type === "bite" || (a.type === "hang" && (!a.phase || a.phase === "crouch" || a.phase === "rise" || a.phase === "hang")))) return true;
      return c.queue.some((q) => q.type === "bite" || q.type === "hang");
    }

    /* =====================================================================
       談戀愛（溫馨版）：灰貓（公）看到棕貓（母）→ 冒愛心 → 走過去用頭蹭她的臉 →
       坐在一起幫她舔頭毛 → 兩隻面向前坐，尾巴繞成一顆大愛心，冒出小愛心
       ===================================================================== */
    const tailCv = document.createElement("canvas");
    tailCv.className = "love-tail";
    tailCv.width = LOVE_TAIL_W; tailCv.height = LOVE_TAIL_H;
    tailCv.style.display = "none";
    layer.insertBefore(tailCv, layer.firstChild);
    {
      const tc = tailCv.getContext("2d");
      const img = tc.createImageData(LOVE_TAIL_W, LOVE_TAIL_H);
      const TP = { k: hexRGB("#010101"), g: hexRGB(DATA.pal.gray.b), G: hexRGB(DATA.pal.gray.d), o: hexRGB(DATA.pal.brown.b), O: hexRGB(DATA.pal.brown.d) };
      LOVE_FRAMES.tailHeart.split("/").forEach((row, y) => {
        for (let x = 0; x < row.length && x < LOVE_TAIL_W; x++) {
          const c = TP[row[x]];
          if (!c) continue;
          const i = (y * LOVE_TAIL_W + x) * 4;
          img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
        }
      });
      tc.putImageData(img, 0, 0);
    }
    const loveHearts = [];
    function loveHeart(x, y, size) {
      const el = document.createElement("div");
      el.className = "love-heart";
      el.innerHTML = iconSVG("heart");
      const s = size || rand(10, 15);
      el.style.width = el.style.height = Math.round(s) + "px";
      el.style.left = Math.round(x - s / 2) + "px";
      el.style.bottom = Math.round(floorY - y) + "px";
      el.style.setProperty("--dx", Math.round(rand(-10, 10)) + "px");
      el.style.animationDuration = Math.round(rand(1300, 1900)) + "ms";
      layer.appendChild(el);
      loveHearts.push(el);
      setTimeout(() => { el.remove(); const i = loveHearts.indexOf(el); if (i >= 0) loveHearts.splice(i, 1); }, 2000);
    }
    /* 頭上方（聊天室座標） */
    function headTop(cat) {
      const f = cat.cur || SPRITES[cat.name].sit[0];
      const ax = cat.dir < 0 ? W - 1 - f.cx : f.cx;
      return { x: cat.x + (ax + 0.5) * S, y: floorY - cat.y - (H - f.top) * S };
    }
    function loveAct(fk, dir) { return { type: "love", fk, dur: 1e9, face: dir }; }
    function startLove(now) {
      const g = cats.find((c) => c.name === "gray"), b = other(g);
      soc = { kind: "love", a: g, b, g, br: b, t0: now, phase: "", ready: new Set() };
      const center = clamp((g.x + b.x) / 2, minX() + 20 * S, maxX() - 20 * S);
      arrange(now, center, 40 * S, (now) => {
        /* 1 心動：灰貓看到棕貓，頭上冒愛心 */
        const s = soc;
        s.gdir = g.x < b.x ? 1 : -1;
        setAct(g, loveAct("side", s.gdir), now);
        setAct(b, { type: "sit", dur: 1e9 }, now);
        hideBubble(b, now);
        showBubble(g, now, "heart");
        g.bubbleUntil = now + 1700;
        s.phase = "notice";
        s.until = now + 1700;
      }, rand(44, 54));
    }
    function loveStep(now) {
      const s = soc, g = s.g, b = s.br;
      if (s.phase === "notice" && now > s.until) {
        /* 2 走過去 */
        hideBubble(g, now);
        g.nextBubble = now + 1e9; b.nextBubble = now + 1e9;
        const gx = b.x - s.gdir * 23 * S;
        s.phase = "approach";
        s.ready.clear();
        setAct(b, loveAct("side", -s.gdir), now);
        if (Math.abs(g.x - gx) < 2 || (gx - g.x) * s.gdir < 0) { s.ready.add(g); }
        else setAct(g, moveAct("walk", gx, rand(46, 54)), now);
        return;
      }
      if (s.phase === "approach" && s.ready.has(g)) {
        /* 蹭蹭：灰貓低頭閉眼蹭她的臉 */
        g.el.style.zIndex = "3"; b.el.style.zIndex = "1";
        setAct(g, loveAct("nuzzle", s.gdir), now);
        setAct(b, loveAct("sideHappy", -s.gdir), now);
        s.phase = "nuzzle"; s.until = now + 2600; s.nextHeart = now + 200;
        return;
      }
      if (s.phase === "nuzzle" || s.phase === "lick" || s.phase === "tail") {
        if (now > s.nextHeart) {
          const p = s.phase === "tail" ? { x: (s.tx || 0) + rand(-40, 40), y: floorY - rand(40, 70) } : (() => { const h = headTop(b); return { x: (h.x + headTop(g).x) / 2 + rand(-12, 12), y: h.y - rand(0, 10) }; })();
          loveHeart(p.x, p.y, s.phase === "tail" ? rand(10, 18) : rand(9, 14));
          s.nextHeart = now + (s.phase === "tail" ? rand(220, 380) : rand(380, 620));
        }
      }
      if (s.phase === "nuzzle") {
        /* 蹭的時候頭輕輕上下 */
        g.act.fk = Math.floor((now - g.act.t0) / 320) % 3 === 2 ? "nuzzle2" : "nuzzle";
        if (now > s.until) {
          /* 3 坐在一起，灰貓坐高高幫她舔頭毛，她低頭閉眼 */
          g.x = clamp(g.x + s.gdir * 3 * S, minX(), maxX());
          setAct(g, loveAct("tall", s.gdir), now);
          setAct(b, loveAct("bow", -s.gdir), now);
          g.el.style.zIndex = "3"; b.el.style.zIndex = "1";
          s.phase = "lick"; s.until = now + 3000;
        }
        return;
      }
      if (s.phase === "lick") {
        const k = Math.floor((now - g.act.t0) / 260) % 4;
        g.act.fk = k === 1 || k === 2 ? "lick" : "tall";
        if (now > s.until) {
          /* 4 她往旁邊挪一步，兩隻面向前坐 */
          setAct(g, loveAct("front", s.gdir), now);
          const bx = clamp(b.x + s.gdir * 6 * S, minX(), maxX());
          s.phase = "scoot"; s.ready.clear();
          if (Math.abs(bx - b.x) < 3) s.ready.add(b);
          else setAct(b, moveAct("walk", bx, 40), now);
        }
        return;
      }
      if (s.phase === "scoot" && s.ready.has(b)) {
        setAct(b, loveAct("front", -s.gdir), now);
        /* 尾巴繞成一顆愛心：放在兩隻中間、身體後面 */
        const cg = g.x + (s.gdir > 0 ? 12.5 : W - 12.5) * S, cb = b.x + (s.gdir > 0 ? W - 12.5 : 12.5) * S;
        s.tx = (cg + cb) / 2;
        tailCv.style.width = LOVE_TAIL_W * S + "px";
        tailCv.style.height = LOVE_TAIL_H * S + "px";
        tailCv.style.transform = "translate3d(" + Math.round(s.tx - LOVE_TAIL_W * S / 2) + "px,0,0)" + (s.gdir < 0 ? " scaleX(-1)" : "");
        tailCv.style.display = "block";
        tailCv.style.clipPath = "inset(100% 0 0 0)";
        s.phase = "tail"; s.tail0 = now; s.until = now + 3600; s.nextHeart = now + 300;
        return;
      }
      if (s.phase === "tail") {
        /* 尾巴慢慢從下往上翹起來，繞成愛心 */
        const p = clamp((now - s.tail0) / 650, 0, 1);
        tailCv.style.clipPath = p >= 1 ? "" : "inset(" + ((1 - p) * 100).toFixed(1) + "% 0 0 0)";
        if (now > s.until) endSoc(now);
      }
    }
    function endLove() {
      tailCv.style.display = "none";
      tailCv.style.clipPath = "";
      for (const el of loveHearts.splice(0)) el.remove();
      const n = performance.now();
      for (const c of cats) if (c.nextBubble > n + 1e8) c.nextBubble = n + rand(3000, 7000);
    }

    /* ----- 保險：一隻貓出錯不能讓整個迴圈停掉（停掉＝兩隻貓凍住、被咬的泡泡卡在畫面上） ----- */
    let petErrN = 0;
    function petWarn(err) { if (err && petErrN++ < 5) { try { console.warn("[room-pets] 已自動恢復：", err); } catch (_) {} } }
    function petSafeReset(c, now, err) {
      petWarn(err);
      try {
        const a = c.act;
        for (const j of jellies.slice()) if (j.cat === c || (a && j.act === a)) resetJelly(j);
      } catch (_) {}
      try { if (soc && inSoc(c)) endSoc(now); } catch (_) { soc = null; }
      c.queue = []; c.pendingTap = false; c.y = 0; c._hangOn = false; c.stillMs = 0;
      if (c.hangCv) c.hangCv.style.display = "none";
      if (c.hangFront) c.hangFront.style.display = "none";
      if (c.body) c.body.style.visibility = "";
      c.hangKey = null; c.cur = null;
      if (!Number.isFinite(c.x)) c.x = (minX() + maxX()) / 2;
      c.x = clamp(c.x, minX(), maxX());
      if (c.dir !== 1 && c.dir !== -1) c.dir = 1;
      if (ball.carrier === c) { ball.state = "loose"; ball.carrier = null; }
      c.act = { type: "sit", t0: now, dur: rand(1500, 2600) };
    }
    /* 跳／吊的最長時間：超過就當作卡住，直接安全落地坐下 */
    const JUMP_MAX_MS = 2500, HANG_MAX_MS = 16000, BITE_MAX_MS = 12000;
    const HANG_PHASE_MAX = { crouch: 1200, rise: 1500, fall: 2500, land: 2000, sit: 4000 };
    function petWatchdog(c, now) {
      const a = c.act;
      if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) { petSafeReset(c, now, new Error("cat position NaN")); return; }
      if (!a) { petSafeReset(c, now); return; }
      if (a.type === "jump" && now - a.t0 > JUMP_MAX_MS) { petSafeReset(c, now, new Error("jump watchdog")); return; }
      if (a.type === "bite" && now - a.t0 > BITE_MAX_MS) { petSafeReset(c, now, new Error("bite watchdog")); return; }
      if (a.type === "hang") {
        const age = now - (a.t0 || now), pe = now - (a.pt0 || a.t0 || now);
        const lim = a.phase === "hang" ? (a.dur || 6000) + 1500 : (HANG_PHASE_MAX[a.phase] || 1500);
        if (age > HANG_MAX_MS || pe > lim) petSafeReset(c, now, new Error("hang watchdog: " + a.phase));
      }
    }
    function ballSane() {
      if (![ball.x, ball.y, ball.vx, ball.vy].every(Number.isFinite)) {
        ball.x = areaW / 2; ball.y = floorY - BR; ball.vx = 0; ball.vy = 0; ball.state = "loose"; ball.carrier = null;
      }
    }
    /* 被咬的泡泡節點不見了（刪掉、清除、整個列表重畫）：變形的畫布跟著收掉，咬著／吊著的貓鬆口 */
    function sweepOrphans() {
      const n = performance.now();
      for (const j of jellies.slice()) if (!j.el || !j.el.isConnected) resetJelly(j);
      for (const c of cats) {
        const a = c.act;
        if (a && (a.type === "bite" || a.type === "hang") && a.el && !a.el.isConnected) {
          try { if (a.type === "bite") abortBite(c, n); else hangDrop(c, a, n); } catch (err) { petSafeReset(c, n, err); }
        }
      }
    }
    if (window.MutationObserver) new MutationObserver(sweepOrphans).observe(msgList, { childList: true, subtree: true });

    /* 變形的泡泡畫在 .pet-warp（不在捲動區裡）：捲動時自己跟上，不靠貓的迴圈 */
    scrollEl.addEventListener("scroll", () => {
      for (const j of jellies.slice()) { try { if (!j.el || !j.el.isConnected) resetJelly(j); else placeWarp(j); } catch (_) {} }
    }, { passive: true });
    let last = performance.now();
    let overlapped = false;
    let rafId = 0;
    function loop(now) {
      if (petsOn === false || !chatLive() || document.hidden) {
        rafId = 0;
        document.documentElement.classList.remove("room-pet-drag");
        if (ball.state === "drag") { ball.state = "loose"; ball.dragId = null; }
        /* 停下來（切到背景、聊天室收起來）：咬著／吊著的放開，泡泡不會變形卡在畫面上 */
        for (const c of cats) if (c.act && (c.act.type === "bite" || c.act.type === "hang")) petSafeReset(c, now);
        for (const j of jellies.slice()) resetJelly(j);
        return;
      }
      try {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      geom();
      const shapes = bubbleShapes();
      if (!soc && now > nextSocialAt) {
        if (canJoin(cats[0], now) && canJoin(cats[1], now)) startSocial(now);
        else nextSocialAt = now + 400;
      }
      ballPhysics(dt, now, shapes);
      for (const c of cats) {
        if (!inSoc(c)) ballThink(c, now, false);
        /* 保險：同一個動作卡太久就換下一個 */
        const a = c.act;
        if (a && !inSoc(c) && a.type !== "sleep" && !a.tapped && now - a.t0 > 22000) { c.queue = []; finish(c, now); }
      }
      for (const c of cats) {
        try { petWatchdog(c, now); update(c, now, dt); }
        catch (err) { petSafeReset(c, now, err); }
      }
      socStep(now);
      /* 兩隻重疊時，隨機決定誰在前面 */
      const ov = Math.abs(cats[0].x - cats[1].x) < W * S * 0.7;
      if (ov && !overlapped) { const f = Math.random() < 0.5 ? 0 : 1; cats[f].el.style.zIndex = "3"; cats[1 - f].el.style.zIndex = "1"; }
      overlapped = ov;
      for (const c of cats) {
        try { render(c, now); renderBonkFx(c, now); }
        catch (err) { petSafeReset(c, now, err); }
      }
      jellyStep(now, dt);
      renderFront();
      biteSchedule(now);
      renderBall(now);
      drawShade(now, dt, shapes);
      } catch (err) {
        /* 任何一步出錯：兩隻都安全坐下、泡泡復原，下一格照常跑 */
        petWarn(err);
        for (const c of cats) { try { petSafeReset(c, now); } catch (_) {} }
        try { for (const j of jellies.slice()) resetJelly(j); } catch (_) {}
        ballSane();
      }
      rafId = requestAnimationFrame(loop);
    }
    function wake() {
      if (rafId || petsOn === false || !chatLive() || document.hidden) return;
      last = performance.now();
      measure();
      rafId = requestAnimationFrame(loop);
    }
    window.addEventListener("resize", wake);
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(wake);
      ro.observe(chat);
      ro.observe(inputBar);
    }
    if (window.MutationObserver) new MutationObserver(wake).observe(chat, { attributes: true, attributeFilter: ["hidden"] });
    document.addEventListener("visibilitychange", wake);
    let petsOn = true;
    function petsDisable() {
      if (petsOn === false) return;
      const n = performance.now();
      try { if (soc) endSoc(n); } catch (_) {}
      for (const c of cats) {
        try {
          if (c.act && c.act.type === "bite") abortBite(c, n);
          else if (c.act && c.act.type === "hang") stopBite(c, n);
        } catch (_) {}
        c.queue = []; c.y = 0; c._hangOn = false;
        if (c.hangFront) c.hangFront.style.display = "none";
      }
      for (const j of jellies.slice()) resetJelly(j);
      if (ball.state === "carried" || ball.state === "drag") { ball.state = "loose"; ball.carrier = null; ball.dragId = null; }
      ball.vx = 0; ball.vy = 0;
      petsOn = false;
      for (const el of msgList.querySelectorAll("canvas.bub-shade, canvas.bub-warp")) el.remove();
      for (const el of msgList.querySelectorAll(".bub.jelly")) el.classList.remove("jelly");
      layer.style.display = "none";
      frontWrap.style.display = "none";
      if (warpLayer) warpLayer.style.display = "none";
      chat.style.removeProperty("--cat-walk");
      chat.classList.add("pets-off");
    }
    function petsEnable() {
      if (petsOn !== false) return;
      petsOn = true;
      layer.style.display = "";
      frontWrap.style.display = "";
      if (warpLayer) warpLayer.style.display = "";
      chat.classList.remove("pets-off");
      const n = performance.now();
      last = n;
      nextSocialAt = Math.max(nextSocialAt, n + rand(6000, 12000));
      nextBiteAt = Math.max(nextBiteAt, n + rand(6000, 12000));
      wake();
    }
    window.addEventListener("sc-pets", (e) => { if (e.detail && e.detail.on) petsEnable(); else petsDisable(); });
    try { if (localStorage.getItem("sc-pets") === "off") petsOn = false; } catch (_) {}
    if (petsOn === false) petsDisable(); else wake();
    /* 測試用：window.__cats 可以直接觸發互動 */
    window.__cats = { cats, ball, get enabled() { return petsOn !== false; }, setEnabled: (on) => { if (on) petsEnable(); else petsDisable(); }, bonk: (i) => { const c = cats[i || 0]; c.bonkCd = 0; return bonk(c, performance.now()); }, get S() { return S; }, get floorY() { return floorY; },
      throwBall: (x, y, vx, vy) => { ball.state = "loose"; ball.carrier = null; ball.x = x; ball.y = y; ball.vx = vx; ball.vy = vy; onThrow(performance.now()); },
      give: (i) => { endSoc(performance.now()); catchBall(cats[i], performance.now()); },
      ballFight: () => { const n = performance.now(); endSoc(n); if (ball.state !== "carried") catchBall(cats[0], n); const c = ball.carrier; startBallFight(other(c), c, n); },
      calm: (ms) => { const n = performance.now(); endSoc(n); for (const c of cats) { c.ballUntil = 0; c.stealCd = 0; } if (ball.state !== "drag") { ball.state = "loose"; ball.carrier = null; } nextSocialAt = n + (ms || 8000); },
      place: (i, x, act) => { const c = cats[i]; c.x = x; c.queue = []; start(c, act || { type: "sit", dur: 1e9 }, performance.now()); },
      get soc() { return soc; }, startFight: () => { endSoc(performance.now()); startFight(performance.now()); }, startChase: () => { endSoc(performance.now()); startChase(cats[0], cats[1], performance.now()); }, tap: (i) => tapSit(cats[i], performance.now()),
      /* 咬泡泡：bite(i) 讓第 i 隻去咬最近咬得到的泡泡；bite(i, { now: true }) 直接站好開始咬；
         biteTargets(i) 列出咬得到的泡泡；letGo() 全部鬆口；jelly 看目前泡泡變形 */
      bite: (i, o) => debugBite(i, o || {}), biteTargets: (i) => biteTargets(cats[i || 0]).map((t) => ({ text: t.el.textContent, standX: t.standX, dir: t.dir })),
      letGo: () => { const n = performance.now(); for (const c of cats) { if (c.act && c.act.type === "bite") { c.queue = []; finish(c, n); } else if (c.act && c.act.type === "hang") stopBite(c, n); } },
      /* 跳起來吊在泡泡上：hang(i) 讓第 i 隻去吊最近吊得到的泡泡；hang(i, { now: true, dur: 5000 })；hangTargets(i)；hangInfo(i) */
      hang: (i, o) => debugHang(i, o || {}),
      hangTargets: (i) => hangTargets(cats[i || 0]).map((t) => ({ text: t.el.textContent, rank: t.rank, standX: t.standX, dir: t.dir, mx: t.mx })),
      hangInfo: (i) => { const c = cats[i || 0], a = c.act; if (!a || a.type !== "hang") return null; return { phase: a.phase, D: a.D, mouth: a.mouth, text: a.el.textContent, y: c.y, fi: a.fi, hl: a.hl, ht: a.ht, on: !!c._hangOn }; },
      biteBusy: () => cats.map(biteBusy),
      get stillMs() { return cats.map((c) => c.stillMs); },
      get jelly() { return jellies.map((j) => ({ text: j.el.textContent, held: j.held, ox: j.ox, oy: j.oy, stretch: j.ox * j.side / j.w })); },
      get nextBiteAt() { return nextBiteAt; }, set nextBiteAt(v) { nextBiteAt = v; },
      /* 談戀愛：love() 立刻開始；soc.phase 看目前階段（notice/approach/nuzzle/lick/scoot/tail） */
      love: () => { const n = performance.now(); endSoc(n); for (const c of cats) { c.ballUntil = 0; if (c.hidden) return false; } if (ball.state === "carried") { ball.state = "loose"; ball.carrier = null; } startLove(n); return true; } };
}
