/* 聊天室裡的兩隻擬真貓（棕色虎斑、灰貓）、螢光球、咬泡泡、吊著與談戀愛。只在這台瀏覽器裡跑，不上傳。 */
import { Droop } from "./droop.js";
import { REAL } from "./real-cats.js";
import { attachRooster } from "./rooster-room.js";
import { attachBobo } from "./bobo-room.js";
import { attachQuokka } from "./quokka-room.js";
export function mountRoomPets() {
    "use strict";
    const DATA = {"W":32,"H":20,"pal":{"gray":{"k":"#010101","b":"#a79e99","d":"#6f645e","p":"#efaea1","w":"#fefdfb","t":"#e27880","f":"#807873"},"brown":{"k":"#9aadc4","b":"#3a4458","d":"#242c3c","p":"#7d8ca3","w":"#f7f4e4","t":"#e2c14a","f":"#2a3344"}},"frames":{"gray":{"sit":["///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbwbbbwbbdk/....kkkbbbkbkbkbbbkkk/......kdbbbbbbbbbdk/....kkkbbbbbbbbbbbkkk/.......kkbbbbbbbkk....kkk/.........kbbbbbk.....kdddk/.........kppbbddk...kdbdbk/.........kpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kddkbbkbbkk/..........kkkkkkkk"],"walk":["///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kddk.........kbbbbbbbbbwbbkk..k/kbbk.........kbbbbbbbbbkbbbtkk/kddkkkkkkkkkkkbbbbbbbbbbbbbk/.kbbbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbppppppbbbbbk/...kbbkkffkkkkkbbkffk/...kbbkkffk...kbbkffk/...kbbkkffk...kbbkffk/....kk..kk.....kk.kk","////................k.....k/...............kbk...kbk/...kk.........kbpbkkkbpbk/..kbbk........kbppbbbppbbk/.kddk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbpppppppbbbbk/....kbbffkkkkkkkbbfk/....kbbffk.....kbbfk/....kbbkk.......kffk/.....kk..........kk","///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kddk.........kbbbbbbbbbwbbkk..k/kbbk.........kbbbbbbbbbkbbbtkk/kddkkkkkkkkkkkbbbbbbbbbbbbbk/.kbbbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbbpppppppbbbk/...kffkkbbkkkkkffkbbk/...kffkkbbk...kffkbbk/...kffkkbbk...kffkbbk/....kk..kk.....kk.kk","////................k.....k/...............kbk...kbk/...kk.........kbpbkkkbpbk/..kbbk........kbppbbbppbbk/.kddk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbppppppppbbbk/....kffbbkkkkkkkfbbk/....kffbbk.....kfbbk/....kffkk.......kbbk/.....kk..........kk"],"run":["///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kkbbkffkkffkbbkk/......kbbkffkkffkbbk/......kbbkffkkffkbbk/.......kbbkffffkbbk/........kk.kkkk.kk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbdbbdbbdbbbbbbbbbbbbkk.kk/..kkbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbbbkkk/...kbbbbbppppppppppbbbk/..kffbbkkkkkkkkkkkkbbffk/..kfbbk............kbbfk/.kfbbk..............kbbfk/.kbbk................kbbk/..kk..................kk","///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kfbbkkkkkkkbbfkk/.....kfbbk.....kbbfk/.....kfbbk.....kbbfk/....kfbbk.......kbbfk/.....kkk.........kkk","////................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kkkkbbfffbbkkkkk/........kbbfffbbk/.......kbbffffkbbk/........kkkkkk.kk"],"jump":["//////................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbffbpppppppffbbk/...kbbffkkkkkkkkffbbk/....kkkk........kkkk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/.............kbbbbbbbbbkbbbtkk/....kkkkkkkkkkbbbbbbbbbbbbbk/...kbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/.kddbbbbbbbbbbbbbbbbkbbkk/kbbkbbbbbbbbbbbbbbbbbbk/ddkkbbbbbppppppppbbbkk/kkkffbbkkkkkkkkkkkkk/.kffbbk/kffbbk/.kkkk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/...kk........kbbbdbdbbbbbbk/..kbbk.......kbbbbbbbbbwbbkk..k/.kbbk........kbbbbbbbbbkbbbtkk/.kddkkkkkkkkkkbbbbbbbbbbbbbk/..kbbbbdbbdbbdbbbbbbbbbbbkk.kk/...kbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbkkkkk/....kbbbbbbbbbbbbbbbk/....kbbbfbpppppfbbbbk/.....kbbfkkkkkkfbbkk/......kbbk....kbbk/.......kk......kk"],"sleep":["///////////...............kkk.....kkk/......kkkkkkkkkpbbkkkkkbbpk/.....kbbdbbdbbkppbdbdbdbppk/....kbbbdbbdbbkbbbdbbbdbbbk/....kbbbbbbbbbkbbbbbbbbbbbk/...kkbbbbbbbbbkdbbbbbbbbbdk/..kdbbbbbbbbkkkbbkkbkbkkbbkkk/..kbdbbbdbbbdbkdbbbbbbbbbdk/...kkkkkkkkkkkkbbbbbbbbbbbkkk","//////////...............kkk.....kkk/......kkkkkkkkkpbbkkkkkbbpk/.....kbbdbbdbbkppbdbdbdbppk/....kbbbdbbdbbkbbbdbbbdbbbk/....kbbbbbbbbbkbbbbbbbbbbbk/....kbbbbbbbbbkdbbbbbbbbbdk/...kkbbbbbbbkkkbbkkbkbkkbbkkk/..kdbbbbbbbbbbkdbbbbbbbbbdk/..kbdbbbdbbbkkkbbbbbbbbbbbkkk/...kkkkkkkkk...kkkkkkkkkkk"],"scratch":["/...........kkk.....kkk/..........kpbbkkkkkbbpk/..........kppbdbdbdbppk/..........kbbbdbbbdbbbk/..........kbbbbbbbbbbbk/..........kdbbwbbbwbbdk...kk/........kkkbbbkbkbkbbbkkkkbbk/..........kdbbbbbbbbbdkkbbbbk/........kkkbbbbbbbbbbbbbbbkk/...........kbbbbbbbbbbbbkk/...........kbbppppbbbbkkkkkk/...........kbbppppbbffffffffk/...........kbbppppbbffffffffk/.......kk..kbbppppbbkkkkkkkk/......kddk.kbbppppbbk/.......kbbkbbbbbbbbbk/........kddbkffkkbbk/.........kkkkffkkbbk/.............kk..kk","/...........kkk.....kkk/..........kpbbkkkkkbbpk/..........kppbdbdbdbppk/..........kbbbdbbbdbbbk/..........kbbbbbbbbbbbk...kk/..........kdbbwbbbwbbdk.kkffk/........kkkbbbkbkbkbbbkkffffk/..........kdbbbbbbbbbdffffkk/........kkkbbbbbbbbbffffkkkk/...........kbbbbbbbbffkkbbbbk/...........kbbppppbbbbbbbbbbk/...........kbbppppbbbbbbkkkk/...........kbbppppbbkkkk/.......kk..kbbppppbbk/......kddk.kbbppppbbk/.......kbbkbbbbbbbbbk/........kddbkffkkbbk/.........kkkkffkkbbk/.............kk..kk"],"lick1":["///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdkkkkbbbbbdk/....kkkbkppkkbkkbbkkk/......kdkbbktbbbbdk/....kkkbkbbkbbbbbbkkk/.......kkbbkbbbbkk....kkk/........kbbkbbbk.....kdddk/........kbbkbbddk...kdbdbk/........kdbkpbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kddkbbkbbkk/..........kkkkkkkk","///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbkkkkkbkkbbkkk/......kdkppkbbbbbdk/....kkkbkbbkbbbbbbkkk/.......kkbbkbbbbkk....kkk/........kbbkbbbk.....kdddk/........kbbkbbddk...kdbdbk/........kdbkpbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kddkbbkbbkk/..........kkkkkkkk"],"lick2":["/////.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbbkkbkbkkbbkkk/......kdbbbbtbbbbdk...kkk/....kkkbbbbbbbbbbbkkkkdddk/.......kkkppbbddkk..kdbdbk/.........kpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kddkbbkbbkk/..........kkkkkkkk","//////.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbbkkbkbkkbbkkk.kkk/......kdbbbbtbbbbdk..kdddk/....kkkbbbbbbbbbbbkkkdbdbk/.......kkkpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kddkbbkbbkk/..........kkkkkkkk"],"lick3":["//......kkk/.....kpppk/.....kpppk/.....kbbbk.kkk.....kkk/.....kbbbkkpbbkkkkkbbpk/.....kbbbkkppbdbdbdbppk/.....kbbbkkbbbdbbbdbbbk/.....kbbbkkbbbbbbbbbbbk/.....kbbbkkdbbbbbbbbbdk/.....kbbkkkbbkkbkbkkbbkkk/.....kbbbkkdbbbbtbbbbdk/.....kbbkkkbbbbbbbbbbbkkk/.....kbbbbbbbbbbbbbbbbbk...kk/......kkbbbbbbbbbbbbbbbk.kkddk/.......kbbbbbbbbbbbbbbbkkdbbk/.......kbbbbbbbbbbbbbbbbbbkk/.......kbbpppppppppppbbkkk/........kkkkkkkkkkkkkkk","//......kkk/.....kpppk/.....kpppk/.....kbbbk/.....kbbbk.kkk.....kkk/.....kbbbkkpbbkkkkkbbpk/.....kbbbkkppbdbdbdbppk/.....kbbbkkbbbdbbbdbbbk/.....kbbbkkbbbbbbbbbbbk/.....kbbbkkdbbbbbbbbbdk/.....kbbkkkbbkkbkbkkbbkkk/.....kbbbbkdbbbbbbbbbdk/.....kbbkkkbbbbbbbbbbbkkk..kk/......kkbbbbbbbbbbbbbbbk.kkddk/.......kbbbbbbbbbbbbbbbkkdbbk/.......kbbbbbbbbbbbbbbbbbbkk/.......kbbpppppppppppbbkkk/........kkkkkkkkkkkkkkk"]},"brown":{"sit":["///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbwbbbwbbdk/....kkkbbbkbkbkbbbkkk/......kdbbbbbbbbbdk/....kkkbbbbbbbbbbbkkk/.......kkbbbbbbbkk....kkk/.........kbbbbbk.....kdddk/.........kppbbddk...kdbdbk/.........kpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kbbkbbkbbkk/..........kkkkkkkk"],"walk":["///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kddk.........kbbbbbbbbbwbbkk..k/kbbk.........kbbbbbbbbbkbbbtkk/kddkkkkkkkkkkkbbbbbbbbbbbbbk/.kbbbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbppppppbbbbbk/...kbbkkffkkkkkbbkffk/...kbbkkffk...kbbkffk/...kbbkkffk...kbbkffk/....kk..kk.....kk.kk","////................k.....k/...............kbk...kbk/...kk.........kbpbkkkbpbk/..kbbk........kbppbbbppbbk/.kddk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbpppppppbbbbk/....kbbffkkkkkkkbbfk/....kbbffk.....kbbfk/....kbbkk.......kffk/.....kk..........kk","///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kddk.........kbbbbbbbbbwbbkk..k/kbbk.........kbbbbbbbbbkbbbtkk/kddkkkkkkkkkkkbbbbbbbbbbbbbk/.kbbbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbbpppppppbbbk/...kffkkbbkkkkkffkbbk/...kffkkbbk...kffkbbk/...kffkkbbk...kffkbbk/....kk..kk.....kk.kk","////................k.....k/...............kbk...kbk/...kk.........kbpbkkkbpbk/..kbbk........kbppbbbppbbk/.kddk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbppppppppbbbk/....kffbbkkkkkkkfbbk/....kffbbk.....kfbbk/....kffkk.......kbbk/.....kk..........kk"],"run":["///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kkbbkffkkffkbbkk/......kbbkffkkffkbbk/......kbbkffkkffkbbk/.......kbbkffffkbbk/........kk.kkkk.kk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbdbbdbbdbbbbbbbbbbbbkk.kk/..kkbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbbbkkk/...kbbbbbppppppppppbbbk/..kffbbkkkkkkkkkkkkbbffk/..kfbbk............kbbfk/.kfbbk..............kbbfk/.kbbk................kbbk/..kk..................kk","///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kfbbkkkkkkkbbfkk/.....kfbbk.....kbbfk/.....kfbbk.....kbbfk/....kfbbk.......kbbfk/.....kkk.........kkk","////................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kkkkbbfffbbkkkkk/........kbbfffbbk/.......kbbffffkbbk/........kkkkkk.kk"],"jump":["//////................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbffbpppppppffbbk/...kbbffkkkkkkkkffbbk/....kkkk........kkkk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/.............kbbbbbbbbbkbbbtkk/....kkkkkkkkkkbbbbbbbbbbbbbk/...kbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/.kddbbbbbbbbbbbbbbbbkbbkk/kbbkbbbbbbbbbbbbbbbbbbk/ddkkbbbbbppppppppbbbkk/kkkffbbkkkkkkkkkkkkk/.kffbbk/kffbbk/.kkkk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/...kk........kbbbdbdbbbbbbk/..kbbk.......kbbbbbbbbbwbbkk..k/.kbbk........kbbbbbbbbbkbbbtkk/.kddkkkkkkkkkkbbbbbbbbbbbbbk/..kbbbbdbbdbbdbbbbbbbbbbbkk.kk/...kbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbkkkkk/....kbbbbbbbbbbbbbbbk/....kbbbfbpppppfbbbbk/.....kbbfkkkkkkfbbkk/......kbbk....kbbk/.......kk......kk"],"sleep":["///////////...............kkk.....kkk/......kkkkkkkkkpbbkkkkkbbpk/.....kbbdbbdbbkppbdbdbdbppk/....kbbbdbbdbbkbbbdbbbdbbbk/....kbbbbbbbbbkbbbbbbbbbbbk/...kkbbbbbbbbbkdbbbbbbbbbdk/..kdbbbbbbbbkkkbbkkbkbkkbbkkk/..kbdbbbdbbbdbkdbbbbbbbbbdk/...kkkkkkkkkkkkbbbbbbbbbbbkkk","//////////...............kkk.....kkk/......kkkkkkkkkpbbkkkkkbbpk/.....kbbdbbdbbkppbdbdbdbppk/....kbbbdbbdbbkbbbdbbbdbbbk/....kbbbbbbbbbkbbbbbbbbbbbk/....kbbbbbbbbbkdbbbbbbbbbdk/...kkbbbbbbbkkkbbkkbkbkkbbkkk/..kdbbbbbbbbbbkdbbbbbbbbbdk/..kbdbbbdbbbkkkbbbbbbbbbbbkkk/...kkkkkkkkk...kkkkkkkkkkk"],"scratch":["/...........kkk.....kkk/..........kpbbkkkkkbbpk/..........kppbdbdbdbppk/..........kbbbdbbbdbbbk/..........kbbbbbbbbbbbk/..........kdbbwbbbwbbdk...kk/........kkkbbbkbkbkbbbkkkkbbk/..........kdbbbbbbbbbdkkbbbbk/........kkkbbbbbbbbbbbbbbbkk/...........kbbbbbbbbbbbbkk/...........kbbppppbbbbkkkkkk/...........kbbppppbbffffffffk/...........kbbppppbbffffffffk/.......kk..kbbppppbbkkkkkkkk/......kddk.kbbppppbbk/.......kbbkbbbbbbbbbk/........kddbkffkkbbk/.........kkkkffkkbbk/.............kk..kk","/...........kkk.....kkk/..........kpbbkkkkkbbpk/..........kppbdbdbdbppk/..........kbbbdbbbdbbbk/..........kbbbbbbbbbbbk...kk/..........kdbbwbbbwbbdk.kkffk/........kkkbbbkbkbkbbbkkffffk/..........kdbbbbbbbbbdffffkk/........kkkbbbbbbbbbffffkkkk/...........kbbbbbbbbffkkbbbbk/...........kbbppppbbbbbbbbbbk/...........kbbppppbbbbbbkkkk/...........kbbppppbbkkkk/.......kk..kbbppppbbk/......kddk.kbbppppbbk/.......kbbkbbbbbbbbbk/........kddbkffkkbbk/.........kkkkffkkbbk/.............kk..kk"],"lick1":["///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdkkkkbbbbbdk/....kkkbkppkkbkkbbkkk/......kdkbbktbbbbdk/....kkkbkbbkbbbbbbkkk/.......kkbbkbbbbkk....kkk/........kbbkbbbk.....kdddk/........kbbkbbddk...kdbdbk/........kdbkpbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kbbkbbkbbkk/..........kkkkkkkk","///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbkkkkkbkkbbkkk/......kdkppkbbbbbdk/....kkkbkbbkbbbbbbkkk/.......kkbbkbbbbkk....kkk/........kbbkbbbk.....kdddk/........kbbkbbddk...kdbdbk/........kdbkpbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kbbkbbkbbkk/..........kkkkkkkk"],"lick2":["/////.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbbkkbkbkkbbkkk/......kdbbbbtbbbbdk...kkk/....kkkbbbbbbbbbbbkkkkdddk/.......kkkppbbddkk..kdbdbk/.........kpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kbbkbbkbbkk/..........kkkkkkkk","//////.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbbkkbkbkkbbkkk.kkk/......kdbbbbtbbbbdk..kdddk/....kkkbbbbbbbbbbbkkkdbdbk/.......kkkpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kbbkbbkbbkk/..........kkkkkkkk"],"lick3":["//......kkk/.....kpppk/.....kpppk/.....kbbbk.kkk.....kkk/.....kbbbkkpbbkkkkkbbpk/.....kbbbkkppbdbdbdbppk/.....kbbbkkbbbdbbbdbbbk/.....kbbbkkbbbbbbbbbbbk/.....kbbbkkdbbbbbbbbbdk/.....kbbkkkbbkkbkbkkbbkkk/.....kbbbkkdbbbbtbbbbdk/.....kbbkkkbbbbbbbbbbbkkk/.....kbbbbbbbbbbbbbbbbbk...kk/......kkbbbbbbbbbbbbbbbk.kkddk/.......kbbbbbbbbbbbbbbbkkdbbk/.......kbbbbbbbbbbbbbbbbbbkk/.......kbbpppppppppppbbkkk/........kkkkkkkkkkkkkkk","//......kkk/.....kpppk/.....kpppk/.....kbbbk/.....kbbbk.kkk.....kkk/.....kbbbkkpbbkkkkkbbpk/.....kbbbkkppbdbdbdbppk/.....kbbbkkbbbdbbbdbbbk/.....kbbbkkbbbbbbbbbbbk/.....kbbbkkdbbbbbbbbbdk/.....kbbkkkbbkkbkbkkbbkkk/.....kbbbbkdbbbbbbbbbdk/.....kbbkkkbbbbbbbbbbbkkk..kk/......kkbbbbbbbbbbbbbbbk.kkddk/.......kbbbbbbbbbbbbbbbkkdbbk/.......kbbbbbbbbbbbbbbbbbbkk/.......kbbpppppppppppbbkkk/........kkkkkkkkkkkkkkk"]}}};
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
    const HANG_W = 20, HANG_H = 32; /* 吊著的畫布：頭在上、身體垂下來 */
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

    /* 心情泡泡、愛心、星星：平滑的向量圖示（配合擬真貓） */
    const SMOOTH_ICONS = {
      heart: '<path d="M12 21.2s-7.6-4.7-9.7-9.4C.8 8.3 2.9 4.3 6.7 4.3c2.2 0 3.7 1.2 5.3 3.1 1.6-1.9 3.1-3.1 5.3-3.1 3.8 0 5.9 4 4.4 7.5-2.1 4.7-9.7 9.4-9.7 9.4z" fill="#e8475f"/><path d="M6.4 6.6c-1.6.2-2.6 1.6-2.4 3.2" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
      note: '<path d="M9 17.5V5.2l10-2v11.6" stroke="#4f63e8" stroke-width="2.2" fill="none" stroke-linejoin="round"/><ellipse cx="6.6" cy="17.8" rx="3.2" ry="2.5" fill="#4f63e8"/><ellipse cx="16.6" cy="15.2" rx="3.2" ry="2.5" fill="#4f63e8"/>',
      zzz: '<path d="M11 4h8l-8 9h8M4 13h5.5L4 19.5h5.5" stroke="#5c7cfa" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      sparkle: '<path d="M12 1.5c.9 5.4 2.7 8.1 9.5 10.5-6.8 2.4-8.6 5.1-9.5 10.5-.9-5.4-2.7-8.1-9.5-10.5C9.3 9.6 11.1 6.9 12 1.5z" fill="#f4b223"/><circle cx="12" cy="12" r="2.2" fill="#fff6c8"/>',
      fish: '<path d="M2.5 12c3.2-4.6 8-6.2 12.5-4.4L20 4.5v15l-5-3.1C10.5 18.2 5.7 16.6 2.5 12z" fill="#2f97d4"/><circle cx="7.2" cy="11" r="1.2" fill="#fff"/><path d="M11 9.5c1 1.5 1 3.5 0 5" stroke="#1d6f9f" stroke-width="1.2" fill="none" stroke-linecap="round"/>',
      question: '<path d="M8 8.5a4 4 0 1 1 6.2 3.3c-1.4.9-2.2 1.8-2.2 3.4" stroke="#8a5cf0" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="12" cy="19.6" r="1.7" fill="#8a5cf0"/>',
      bang: '<path d="M12 3.5v10.5" stroke="#e8590c" stroke-width="3.4" stroke-linecap="round"/><circle cx="12" cy="19.4" r="2" fill="#e8590c"/>',
      anger: '<path d="M9.2 3.5c.4 2.6-.6 4.6-3.4 5.7M14.8 3.5c-.4 2.6.6 4.6 3.4 5.7M9.2 20.5c.4-2.6-.6-4.6-3.4-5.7M14.8 20.5c-.4-2.6.6-4.6 3.4-5.7" stroke="#e03131" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
      dots: '<circle cx="5" cy="13" r="2.3" fill="#333"/><circle cx="12" cy="13" r="2.3" fill="#333"/><circle cx="19" cy="13" r="2.3" fill="#333"/>'
    };
    function iconSVG(name) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (SMOOTH_ICONS[name] || SMOOTH_ICONS.heart) + "</svg>";
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
      /* 走路、跑步多補中間格（4 格變 8 格），動起來比較順；碰撞範圍沿用前一格 */
      for (const an of ["walk", "run"]) { const a0 = SPRITES[name][an], a8 = []; a0.forEach((f) => { a8.push(f, Object.assign({}, f)); }); SPRITES[name][an] = a8; }
      for (const f of SPRITES[name].walk.concat(SPRITES[name].run)) f.stand = true;
      /* 磨爪：正面站高高、兩隻前腳輪流往下抓（腳是每格即時畫的） */
      { const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
        SPRITES[name].claw = [{ cv, mask: new Uint8Array(W * H), top: 0, minx: 11, maxx: 21, cx: 15.5, side: false, mouth: { x: 16, y: 7.8 } }];
        /* 球雨砸到：搞笑僵住（0＝四腳朝天翻肚、1＝彈起來炸毛） */
        SPRITES[name].funny = [0, 1].map(() => ({ cv, mask: new Uint8Array(W * H), top: 0, minx: 2, maxx: 29, cx: 15.5, side: false, mouth: { x: 22, y: 14 } }));
        /* 便便：0＝蹲下、1/2＝低頭聞、3/4＝扒砂 */
        SPRITES[name].poop = [0, 1, 2, 3, 4].map(() => ({ cv, mask: new Uint8Array(W * H), top: 0, minx: 2, maxx: 29, cx: 15.5, side: false, mouth: { x: 26, y: 10 } }));
        SPRITES[name].pet = REAL.PET_KEYS.map(() => ({ cv, mask: new Uint8Array(W * H), top: 0, minx: 2, maxx: 29, cx: 15.5, side: false, mouth: { x: 16, y: 10 } }));
        /* 趴著／後腳站起來把前腳搭在背上（擬真姿勢即時畫） */
        SPRITES[name].lie = [0, 1, 2, 3].map(() => ({ cv, mask: new Uint8Array(W * H), top: 8, minx: 2, maxx: 30, cx: 20, side: true, mouth: { x: 24, y: 16 } }));
        SPRITES[name].rear = [0, 1, 2, 3, 4, 5].map(() => ({ cv, mask: new Uint8Array(W * H), top: 2, minx: 4, maxx: 28, cx: 19, side: true, mouth: { x: 20, y: 7 } })); }
    }
    /* 每張影格配一個擬真姿勢；頭和嘴的位置跟著擬真的頭（泡泡、球、被打頭的位置才對得上） */
    const LOVE_NAMES = Object.values(LOVE_KEYS);
    for (const name of Object.keys(SPRITES)) for (const anim of Object.keys(SPRITES[name])) SPRITES[name][anim].forEach((f, i) => {
      f.anim = anim; f.fi = i;
      if (anim === "hang") {
        /* 吊著：仰頭朝上咬住泡泡、身體垂在下面四肢亂揮（不再把側面影格轉 90°）；頭另外存一張，畫在泡泡前面 */
        f.rot = false; f.hangF = true; f.pose = REAL.poseFor("hangFront", i, { part: "torso" });
        f.headF = { anim: "hangHead", fi: i, hangF: true, pose: REAL.poseFor("hangFront", i, { part: "head" }) };
        f.pt = { x: REAL.HF.pt.x, y: REAL.HF.pt.y }; f.mouth = { x: f.pt.x, y: f.pt.y }; f.cx = REAL.HF.cx;
        return;
      }
      f.pose = REAL.poseFor(anim, anim === "walk" || anim === "run" ? i / 2 : i, { pt: anim === "bite" ? BITE_PT[i] : null, key: anim === "love" ? LOVE_NAMES[i] : null });
      const pose = f.pose;
      let hx = null, hy = null;
      if (pose.kind === "side" || pose.kind === "front") { hx = pose.head.x; hy = pose.head.y; }
      else if (pose.kind === "sideSit") { hx = pose.head.x != null ? pose.head.x : 21.0; hy = pose.head.y != null ? pose.head.y : 7.2 - (pose.tall || 0); }
      if (hx != null && anim !== "lick3") {
        f.cx = hx - 0.5; f.top = Math.max(0, Math.round(hy - 5.4));
        if (f.side && anim !== "bite") f.mouth = { x: hx + 3.1, y: hy + 2.0 };
        else if (!f.side) f.mouth = { x: hx, y: hy + 2.1 };
      }
    });
    /* 點擊範圍：直接用擬真圖算（吊著／磨爪的腳會動，取幾個時間點的聯集） */
    function realMask(gw, gh, draws) {
      const cv = document.createElement("canvas"); cv.width = gw * 2; cv.height = gh * 2;
      const c = cv.getContext("2d");
      for (const d of draws) { c.setTransform(2, 0, 0, 2, 0, 0); d(c); }
      const px = c.getImageData(0, 0, gw * 2, gh * 2).data;
      const mask = new Uint8Array(gw * gh);
      let top = gh, minx = gw, maxx = -1;
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
        let on = false;
        for (let k = 0; k < 4 && !on; k++) { const X = x * 2 + (k & 1), Y = y * 2 + (k >> 1); if (px[(Y * gw * 2 + X) * 4 + 3] > 90) on = true; }
        if (on) { mask[y * gw + x] = 1; if (y < top) top = y; if (x < minx) minx = x; if (x > maxx) maxx = x; }
      }
      return { mask, top, minx, maxx };
    }
    for (const name of Object.keys(SPRITES)) {
      try {
        const sd = name === "gray" ? 2.1 : 0;
        const hd = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1.05, 1.2, 1.35, 1.5].map((t) => (c) => { const st = REAL.hangState(t, sd); c.save(); REAL.hangBodyXf(c, st); REAL.drawTail(c, name, REAL.hangTail(t, st), 1); REAL.hangLimbs(c, name, t, sd, st, "hind"); REAL.drawBody(c, name, SPRITES[name].hang[0].pose, 0); REAL.hangLimbs(c, name, t, sd, st, "front"); c.restore(); REAL.drawBody(c, name, SPRITES[name].hang[0].headF.pose, 0); });
        const hm = realMask(20, 32, hd);
        for (const f of SPRITES[name].hang) f.mask = hm.mask;
        const cf = SPRITES[name].claw[0];
        const cd = [[3.0, 9.3], [9.3, 3.0], [6, 6]].map(([a, b]) => (c) => { REAL.drawBody(c, name, cf.pose, 0); REAL.clawArms(c, name, cf.pose, [{ x: 4.4, y: a }, { x: 4.4, y: b }]); });
        const cm = realMask(W, H, cd);
        cf.mask = cm.mask; cf.minx = cm.minx; cf.maxx = cm.maxx;
        for (const ff of SPRITES[name].funny) { const fm = realMask(W, H, [(c) => { if (ff.pose.tail) REAL.drawTail(c, name, ff.pose.tail, 0); REAL.drawBody(c, name, ff.pose, 0); }]); ff.mask = fm.mask; ff.minx = fm.minx; ff.maxx = fm.maxx; }
        SPRITES[name].funny[0].cx = 22.2; SPRITES[name].funny[0].top = 8;
        for (const pf of SPRITES[name].poop) { const pm = realMask(W, H, [(c) => { if (pf.pose.tail) REAL.drawTail(c, name, pf.pose.tail, 0); REAL.drawBody(c, name, pf.pose, 0); }]); pf.mask = pm.mask; pf.minx = pm.minx; pf.maxx = pm.maxx; }
        for (const pf of SPRITES[name].pet) { const pm = realMask(W, H, [(c) => { if (pf.pose && pf.pose.tail) REAL.drawTail(c, name, pf.pose.tail, 0); REAL.drawBody(c, name, pf.pose, 0); }]); pf.mask = pm.mask; pf.minx = pm.minx; pf.maxx = pm.maxx; if (pf.pose && pf.pose.kind === "supine") { pf.cx = 14.9; pf.top = 6; } }
        for (const an of ["lie", "rear"]) for (const pf of SPRITES[name][an]) { const pm = realMask(W, H, [(c) => { if (pf.pose && pf.pose.tail) REAL.drawTail(c, name, pf.pose.tail, 0); REAL.drawBody(c, name, pf.pose, 0); }]); pf.mask = pm.mask; pf.minx = pm.minx; pf.maxx = pm.maxx; }
      } catch (_) {}
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
      const cx = FW / 2 + Math.sin(t / 37) * 1.2, cy = FH - 11 - (Math.round(t / 70) % 2) * 0.6;
      const R = 9;
      const c = fctx, KR = fightCv.width / FW;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, fightCv.width, fightCv.height);
      c.setTransform(KR, 0, 0, KR, 0, 0);
      /* 1) 從煙裡伸出來的爪子／腳／尾巴（毛色跟兩隻貓一樣） */
      for (const l of fs.limbs) {
        const p = (now - l.t0) / l.life;
        if (p < 0) continue;
        const out = Math.sin(clamp(p, 0, 1) * Math.PI);
        const ca = Math.cos(l.ang), sa = Math.sin(l.ang);
        const edge = 1 / Math.sqrt((ca * ca) / (15.5 * 15.5) + (sa * sa) / (11.5 * 11.5));
        const len = edge - 1 + l.len * out;
        const pts = [];
        let a = l.ang;
        for (let s2 = edge * 0.55, n = 0; n < 10; n++, s2 += (len - edge * 0.55) / 9) {
          if (l.kind === "tail") a = l.ang + Math.sin(t / 70 + s2 * 0.35) * 0.25;
          pts.push({ x: cx + Math.cos(a) * s2, y: Math.min(FH - 1.2, cy + Math.sin(a) * s2) });
        }
        const ws = pts.map((_, i) => l.kind === "tail" ? 2.3 - i * 0.1 : 2.7 - i * 0.04);
        REAL.furLimb(c, l.cat, pts, ws, l.kind);
      }
      /* 2) 煙霧團：幾顆圓滾滾的煙球繞著中心轉，看起來在翻滾 */
      const puffs = [{ x: cx, y: cy, rx: R + 2, ry: R - 2 }];
      const n = 7, spin = t / 210;
      for (let i = 0; i < n; i++) {
        const a = spin + i * Math.PI * 2 / n + Math.sin(t / 90 + i) * 0.15;
        const r = 4 + ((i + Math.floor(t / 110)) % 3) * 0.8;
        puffs.push({ x: cx + Math.cos(a) * (R + 1.5), y: Math.min(FH - 1 - r * 0.9, cy + Math.sin(a) * (R - 2.5)), rx: r, ry: r * 0.9 });
      }
      c.fillStyle = "rgba(70,60,52,.55)";
      for (const q of puffs) { c.beginPath(); c.ellipse(q.x, q.y, q.rx + 0.35, q.ry + 0.35, 0, 0, Math.PI * 2); c.fill(); }
      for (const q of puffs) {
        const g = c.createRadialGradient(q.x - q.rx * 0.35, q.y - q.ry * 0.45, 0.2, q.x, q.y, Math.max(q.rx, q.ry) * 1.05);
        g.addColorStop(0, "#ffffff"); g.addColorStop(0.6, "#f1ede7"); g.addColorStop(1, "#d9d1c6");
        c.fillStyle = g; c.beginPath(); c.ellipse(q.x, q.y, q.rx, q.ry, 0, 0, Math.PI * 2); c.fill();
      }
      /* 煙團上的小捲捲線 */
      c.strokeStyle = "rgba(150,138,124,.7)"; c.lineWidth = 0.35; c.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        const a = -spin * 1.3 + i * 2.1;
        const x = cx + Math.cos(a) * 5, y = cy + Math.sin(a) * 3;
        c.beginPath(); c.arc(x, y, 1.3, a, a + 3.6); c.stroke();
      }
      /* 3) 兩顆小星星 */
      if (Math.floor(t / 140) % 3 !== 0) {
        c.fillStyle = "#f6c544"; c.strokeStyle = "rgba(160,110,10,.6)"; c.lineWidth = 0.15;
        for (let i = 0; i < 2; i++) {
          const a = t / 300 + i * Math.PI;
          const sx = cx + Math.cos(a) * 17, sy = cy - 8 + Math.sin(a) * 4;
          c.beginPath();
          for (let k = 0; k < 8; k++) { const rr = k % 2 ? 0.55 : 1.6, aa = k * Math.PI / 4 + t / 400; k ? c.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr) : c.moveTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr); }
          c.closePath(); c.fill(); c.stroke();
        }
      }
      c.setTransform(1, 0, 0, 1, 0, 0);
      const drift = Math.sin(t / 420) * 10 + Math.sin(t / 53) * 1.5;
      const x = Math.round(clamp(fs.cx + drift - FW * S / 2, -FW * S * 0.15, areaW - FW * S * 0.85));
      fightEl.style.transform = "translate3d(" + x + "px," + (-(Math.round(t / 90) % 2)) + "px,0)";
      fs.drawnX = x;
    }

    /* 身體（不含尾巴）先畫好存起來：同一個姿勢只畫一次，之後每格只貼圖＋畫尾巴 */
    let RES = 5; /* 每一格用幾個裝置像素畫 */
    const resHooks = [];
    const realCache = new Map();
    function realBody(name, f, bk, gw, gh) {
      const k = catK(name);
      const key = name + ":" + f.anim + ":" + f.fi + ":" + (bk ? 1 : 0) + (bk === 2 ? "s" : "") + ":" + k;
      let cv = realCache.get(key);
      if (cv) return cv;
      cv = document.createElement("canvas");
      /* 黑貓直接畫在 1.1 倍的畫布上，不要先畫小圖再放大，邊緣才不會糊 */
      cv.width = Math.round(gw * RES * k); cv.height = Math.round(gh * RES * k);
      const c = cv.getContext("2d");
      c.imageSmoothingEnabled = true;
      c.setTransform(cv.width / gw, 0, 0, cv.height / gh, 0, 0);
      if (f.rot) { c.translate(0, 32); c.rotate(-Math.PI / 2); }
      const pose = bk ? Object.assign({}, f.pose, { head: Object.assign({}, f.pose.head) }) : f.pose;
      const out = REAL.drawBody(c, name, pose, bk);
      cv.eyes = out.eyes || null; cv.open = !!out.open;
      realCache.set(key, cv);
      return cv;
    }

    /* ----- 尺寸：手機上 3 倍、很窄時 2 倍，再縮小 15%。黑貓比灰貓大 10%。 ----- */
    const BROWN_K = 1.1;
    /* 幼貓看起來跟 Bobo 差不多高。貓的畫布上方有空位，所以畫布要比 Bobo 的盒子再高一點。 */
    const KITTEN_K = 11.4 * 1.12 * (2 / 3) / 20 * 1.28;
    function catK(cat) {
      if (cat && cat.kit) return KITTEN_K;
      const name = typeof cat === "string" ? cat : cat && cat.name;
      return name === "brown" ? BROWN_K : 1;
    }
    function catS(cat) { return S * catK(cat); }
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
      /* 底部多留一截，讓頭上的對白比較不會壓住最後一則訊息；貓還是會從泡泡後面走過。 */
      chat.style.setProperty("--cat-walk", Math.round(4 * S + 44) + "px");
      geom();
      sizeShade();
      {
        const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
        const r = Math.max(2, Math.round(S * dpr * 2) / 2);
        if (r !== RES) { RES = r; realCache.clear(); }
        for (const h of resHooks) { try { h(); } catch (_) {} }
      }
      if (typeof ball !== "undefined") { ball.x = clamp(ball.x, BR, areaW - BR); ball.y = clamp(ball.y, topY + BR, floorY - BR); }
      for (const c of cats.concat(kits)) {
        const ks = catS(c);
        c.el.style.width = W * ks + "px";
        c.el.style.height = H * ks + "px";
        c.body.style.width = W * ks + "px";
        c.body.style.height = H * ks + "px";
        c.shadow.style.width = 18 * ks + "px";
        const bw = Math.round(W * RES * catK(c)), bh = Math.round(H * RES * catK(c));
        if (c.cv.width !== bw) { c.cv.width = bw; c.cv.height = bh; }
        if (c.hangCv && c.hangCv.width !== Math.round(HANG_W * RES * catK(c))) {
          c.hangCv.width = c.hangFront.width = Math.round(HANG_W * RES * catK(c));
          c.hangCv.height = c.hangFront.height = Math.round(HANG_H * RES * catK(c));
          c.hangKey = null;
        }
        if (!(c.act && (c.act.exit || c.act.enter))) c.x = clamp(c.x, Math.min(minX(), wallX(-1)), Math.max(maxX(), wallX(1)));
        c.cur = null;
      }
      fightEl.style.width = FW * S + "px";
      fightEl.style.height = FH * S + "px";
      if (fightCv.width !== Math.round(FW * RES)) { fightCv.width = Math.round(FW * RES); fightCv.height = Math.round(FH * RES); }
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
    const maxX = () => Math.max(0, areaW - W * S * BROWN_K);
    const GAP = () => W * S * BROWN_K * 0.78;
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
    let frontWrap = null;
    let roosterApi = null;
    let boboApi = null;
    let quokkaApi = null;
    let floorReady = false;
    function geom() {
      chatR = chat.getBoundingClientRect();
      const sr = scrollEl.getBoundingClientRect();
      /* 地板是訊息列表的底。捲到最新時，底就在輸入列上緣；
         內容比視窗短時 slack 是 0，地板仍貼著看得到的底。
         往上翻時 slack 變大，這一層跟著往上離開畫面。 */
      const slack = Math.max(0, scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight);
      const floorScreen = sr.bottom + slack;
      const next = floorScreen - chatR.top;
      const dy = floorReady ? next - floorY : 0;
      if (dy && ball.init) ball.y += dy;
      if (dy && roosterApi) roosterApi.shift(dy);
      if (dy && boboApi) boboApi.shift(dy);
      if (dy && quokkaApi) quokkaApi.shift(dy);
      floorY = next;
      floorReady = true;
      topY = sr.top - chatR.top;
      const bottomCss = Math.round(chatR.bottom - floorScreen) + "px";
      layer.style.bottom = bottomCss;
      if (frontWrap) frontWrap.style.bottom = bottomCss;
      sayLayer.style.bottom = bottomCss;
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
      const ks = catS(cat);
      return { x: cat.x + mx * ks + (f.side ? cat.dir * BR * 0.3 : 0), y: floorY - cat.y - (H - m.y) * ks + BR * 0.5 };
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
      if (carrier && ballEl.parentNode === carrier.el) { tx -= carrier.x; ty += H * catS(carrier); }
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
      if (!fromFinish && a && (a.tapped || a.type === "jump" || a.type === "hang" || a.type === "claw" || a.type === "funny" || a.type === "poop" || cat.pendingTap)) return false;
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
      /* 影子本來就是糊的：用小一點的圖做剪影就好（擬真貓的畫布解析度比較高） */
      const k = Math.min(1, 80 / src.width);
      const sw = Math.max(1, Math.round(src.width * k)), sh = Math.max(1, Math.round(src.height * k));
      if (cv.width !== sw || cv.height !== sh) { cv.width = sw; cv.height = sh; }
      const c = cv.getContext("2d");
      c.globalCompositeOperation = "source-over";
      c.clearRect(0, 0, cv.width, cv.height);
      c.save();
      if (flip) { c.translate(cv.width, 0); c.scale(-1, 1); }
      c.drawImage(src, 0, 0, sw, sh);
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
        if (c._hangOn) continue; /* 吊著時整隻在泡泡前面，不再往泡泡上畫一層背後的影子 */
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

    /* 對白層：跟 .cat-front 一樣疊在訊息前面、輸入列後面，避免長句子被泡泡擋住。 */
    const sayLayer = document.createElement("div");
    sayLayer.className = "cat-say-layer";
    sayLayer.setAttribute("aria-hidden", "true");
    chat.insertBefore(sayLayer, inputBar);

    /* ----- 建立兩隻貓 ----- */
    const cats = [];
    let kits = [];
    function makeCat(name, x, dir) {
      const el = document.createElement("div");
      el.className = "cat cat-" + name;
      const shadow = document.createElement("div");
      shadow.className = "cat-shadow";
      const body = document.createElement("div");
      body.className = "cat-body";
      const cv = document.createElement("canvas");
      cv.width = Math.round(W * RES); cv.height = Math.round(H * RES);
      const bubble = document.createElement("div");
      bubble.className = "cat-bubble";
      const sayEl = document.createElement("div");
      sayEl.className = "cat-say";
      body.appendChild(cv);
      body.appendChild(bubble);
      sayLayer.appendChild(sayEl);
      el.appendChild(shadow);
      el.appendChild(body);
      layer.appendChild(el);
      const ctx = cv.getContext("2d");
      return {
        name, el, shadow, body, cv, ctx, bubble, say: sayEl, paintT: 0, blinkNext: performance.now() + rand(1500, 4000), blinkT0: -1e9, tailPh: rand(0, 6),
        x, y: 0, dir, cur: null, curDir: 0, hidden: false,
        act: null, queue: [],
        mood: pick(Object.keys(MOOD_ICONS)),
        turnUntil: 0, ballUntil: 0, stealCd: 0, stealTries: 0, catchCd: 0, jumpCd: 0, carryUntil: 0,
        bubbleUntil: 0,
        nextBubble: performance.now() + rand(3000, 9000),
        talking: false, sayUntil: 0,
        nextTalk: performance.now() + rand(45000, 90000)
      };
    }

    const now0 = performance.now();
    cats.push(makeCat("brown", 0, 1));
    cats.push(makeCat("gray", 0, -1));
    kits = [0, 1].map((i) => {
      const k = makeCat("gray", 12 + i * 16, i ? 1 : -1);
      k.kit = true;
      k.i = i;
      k.el.classList.add("cat-kit");
      k.el.style.zIndex = "4";
      k.el.hidden = true;
      k.act = { type: "sit", t0: now0, dur: 1e9 };
      return k;
    });
    layer.appendChild(fightEl); /* 煙霧團疊在貓上面 */
    measure();
    cats[0].x = maxX() * 0.18;
    cats[1].x = maxX() * 0.78;
    cats[0].act = { type: "sit", t0: now0, dur: rand(1200, 2000) };
    cats[1].act = { type: "lick1", t0: now0, dur: rand(2000, 2800) };

    const FPS = { walk: 14, run: 16, lick1: 4, lick2: 3, lick3: 4, sleep: 1.1, scratch: 6 }; /* 走路、跑步 8 格，速度不變 */

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
      /* 磨爪：每隻大約每 25–45 秒一次，走到一個空的地方，站起來對著畫面抓幾下 */
      {
        const n = performance.now();
        if (cat.nextClawAt == null) cat.nextClawAt = n + rand(10000, 25000);
        const oa = other(cat).act;
        if (petsOn !== false && n >= cat.nextClawAt && !cat.hidden && cat.y < 0.5) {
          if (oa && oa.type === "claw") cat.nextClawAt = n + rand(4000, 8000);
          else {
            cat.nextClawAt = n + rand(25000, 45000);
            const x = clawSpot(cat);
            if (Math.abs(x - cat.x) > 3) cat.queue.push(moveAct("walk", x));
            cat.queue.push({ type: "claw", dur: rand(2600, 3600) });
            return;
          }
        }
      }
      /* 便便：比打架少。每隻 8～14 分鐘一次，進房後第一次 4～7 分鐘；兩隻之間至少隔 2 分鐘 */
      {
        const n = performance.now();
        if (cat.nextPoopAt == null) cat.nextPoopAt = n + rand(POOP_FIRST[0], POOP_FIRST[1]);
        if (petsOn !== false && n >= cat.nextPoopAt && !cat.hidden && cat.y < 0.5) {
          const oa = other(cat).act;
          if ((oa && oa.type === "poop") || n - lastPoopAt < POOP_ROOM_GAP) cat.nextPoopAt = n + rand(20000, 40000);
          else {
            cat.nextPoopAt = n + rand(POOP_GAP[0], POOP_GAP[1]);
            lastPoopAt = n;
            const x = poopSpot(cat);
            if (Math.abs(x - cat.x) > 3) cat.queue.push(moveAct("walk", x));
            cat.queue.push({ type: "poop", dur: 5600 });
            return;
          }
        }
      }
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
    /* ===== 磨爪 ===== */
    const CLAW_TOP = 2.6, CLAW_BOT = 9.4, CLAW_TIP = 1.05, CLAW_X = 4.4; /* 爪子在格子裡的上下範圍；爪尖在肉球上面多少 */
    function clawPt(cat, gx, gy) { /* 格子座標 → 聊天室座標 */
      return { x: cat.x + (cat.dir < 0 ? W - gx : gx) * S, y: floorY - cat.y - (H - gy) * S };
    }
    function clawSpot(cat) {
      /* 找一個爪痕不會被訊息泡泡蓋住、也不會跟另一隻擠在一起的地方 */
      let best = null;
      for (let k = 0; k < 8; k++) {
        const x = clamp(k === 0 ? cat.x : freeSpot(cat), minX() + 4, maxX() - 4);
        if (k && crowded(cat, x)) continue;
        let ok = true;
        if (chatR) for (const gx of [16 - CLAW_X, 16 + CLAW_X]) for (const gy of [CLAW_TOP - CLAW_TIP, CLAW_BOT]) {
          const p = { x: x + gx * S, y: floorY - (H - gy) * S };
          if (underBubble(chatR.left + p.x, chatR.top + p.y)) ok = false;
        }
        if (ok) { best = x; break; }
        if (best == null) best = x;
      }
      return best == null ? cat.x : best;
    }
    const lerpC = (a, b, t) => a + (b - a) * t;
    const ease2 = (u) => u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
    function clawStep(cat, a, now) {
      cat.y = 0;
      const e = now - a.t0;
      if (!a.paws) {
        a.paws = [{ x: CLAW_X - 0.6, y: 11.2, press: 0 }, { x: CLAW_X - 0.6, y: 11.2, press: 0 }];
        a.per = rand(400, 480); a.first = Math.random() < 0.5 ? 0 : 1; a.k = -1; a.groups = [null, null];
        a.jx = [rand(-0.15, 0.15), rand(-0.15, 0.15)];
      }
      const RISE = 300;
      if (e < RISE) {
        /* 站起來：先出手的那隻舉到最高，另一隻放在下面 */
        const u = ease2(e / RISE);
        a.paws.forEach((q, j) => { q.y = lerpC(11.2, j === a.first ? CLAW_TOP : CLAW_BOT, u); q.x = lerpC(CLAW_X - 0.6, CLAW_X, u); q.press = 0; });
      } else {
        /* 兩隻前腳輪流：一隻壓著往下耙（留下爪痕），同時另一隻離開畫面往上收回去，準備下一耙 */
        const qn = (e - RISE) / a.per, k = Math.floor(qn), u = qn - k, i = (k + a.first) % 2;
        const act = a.paws[i], rest = a.paws[1 - i];
        if (k !== a.k) { a.k = k; a.stroke = null; }
        rest.press = 0; rest.x = CLAW_X - 0.45 + a.jx[1 - i];
        rest.y = lerpC(CLAW_BOT, CLAW_TOP, ease2(Math.min(1, u / 0.9)));
        act.x = CLAW_X + a.jx[i];
        if (u < 0.12) { act.y = CLAW_TOP; act.press = u / 0.12; }
        else if (u < 0.85) {
          const v = (u - 0.12) / 0.73;
          act.y = lerpC(CLAW_TOP, CLAW_BOT, ease2(v)); act.press = 1;
          clawMark(cat, a, i, v, now);
        } else { act.y = CLAW_BOT; act.press = Math.max(0, 1 - (u - 0.85) / 0.1); }
      }
      if (e >= a.dur) { a.paws = null; finish(cat, now); }
    }
    /* ----- 爪痕：每隻腳一組 3–4 道細線，最多同時 6 組，約 10 秒後慢慢淡掉 ----- */
    const markWrap = document.createElement("div");
    markWrap.className = "claw-marks";
    markWrap.setAttribute("aria-hidden", "true");
    layer.appendChild(markWrap);
    const clawMarks = [];
    const MARK_MAX = 6, MARK_LIFE = 10000, MARK_FADE = 1800, MARK_W = 24;
    function killMark(g) {
      const i = clawMarks.indexOf(g);
      if (i >= 0) clawMarks.splice(i, 1);
      try { g.el.remove(); } catch (_) {}
    }
    function clearClawMarks() { for (const g of clawMarks.slice()) killMark(g); }
    function newMarkGroup(cat, a, i, now) {
      while (clawMarks.length >= MARK_MAX) killMark(clawMarks[0]);
      const sx = i ? 1 : -1;
      const p0 = clawPt(cat, 16 + sx * a.paws[i].x, CLAW_TOP - CLAW_TIP), p1 = clawPt(cat, 16 + sx * a.paws[i].x, CLAW_BOT - CLAW_TIP);
      const len = p1.y - p0.y, h = Math.ceil(len + 8);
      const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
      const cv = document.createElement("canvas");
      cv.className = "claw-mark";
      cv.width = Math.round(MARK_W * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = MARK_W + "px"; cv.style.height = h + "px";
      const left = Math.round(p0.x - MARK_W / 2), top = Math.round(p0.y - 3);
      cv.style.left = left + "px";
      cv.style.bottom = Math.round(floorY - (top + h)) + "px";
      markWrap.appendChild(cv);
      const n = Math.random() < 0.55 ? 4 : 3, gap = rand(1.55, 1.95), slant = rand(-0.07, 0.07) * (sx > 0 ? 1 : -1);
      const lines = [];
      for (let j = 0; j < n; j++) {
        lines.push({
          dx: (j - (n - 1) / 2) * gap + rand(-0.3, 0.3), fan: rand(0.02, 0.22), bow: rand(-0.7, 0.7),
          w: rand(0.45, 0.95) * (j === 0 || j === n - 1 ? 0.8 : 1), al: rand(0.3, 0.5), f0: rand(0, 0.2), f1: rand(0.68, 1),
          amp: rand(0.08, 0.25), fq: rand(0.25, 0.6), ph: rand(0, 6.3),
          gapAt: Math.random() < 0.35 ? rand(0.3, 0.75) : -1
        });
      }
      const g = { el: cv, ctx: cv.getContext("2d"), dpr, t0: now, h, len, x: p0.x - left, y0: p0.y - top, lines, slant, reach: 0, passes: 0, cat, a, i, fading: false };
      clawMarks.push(g);
      return g;
    }
    function drawMarkGroup(g) {
      const c = g.ctx, d = g.dpr;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, g.el.width, g.el.height);
      c.setTransform(d, 0, 0, d, 0, 0);
      const deep = Math.min(1, 0.72 + 0.16 * (g.passes - 1));
      for (const L of g.lines) {
        const fe = Math.min(L.f1, g.reach);
        if (fe <= L.f0 + 0.02) continue;
        const pts = [];
        const steps = Math.max(3, Math.ceil((fe - L.f0) * g.len / 0.8));
        for (let s2 = 0; s2 <= steps; s2++) {
          const f = L.f0 + (fe - L.f0) * s2 / steps;
          const y = g.y0 + f * g.len;
          const x = g.x + L.dx * (1 + L.fan * f) + g.slant * f * g.len + L.bow * Math.sin(Math.PI * f) + L.amp * Math.sin(L.fq * f * g.len + L.ph);
          const u = (f - L.f0) / (L.f1 - L.f0);
          let w = L.w * (0.28 + 0.72 * Math.pow(Math.sin(Math.PI * Math.min(1, u)), 0.6));
          if (L.gapAt > 0 && Math.abs(u - L.gapAt) < 0.05) w *= 0.15;
          pts.push({ x, y, w });
        }
        const poly = (k, ox, oy) => {
          c.beginPath();
          pts.forEach((pt, j) => { const X = pt.x + ox - pt.w * k / 2; j ? c.lineTo(X, pt.y + oy) : c.moveTo(X, pt.y + oy); });
          for (let j = pts.length - 1; j >= 0; j--) { const pt = pts[j]; c.lineTo(pt.x + ox + pt.w * k / 2, pt.y + oy); }
          c.closePath();
        };
        const al = L.al * deep;
        c.fillStyle = "rgba(20,24,32," + (al * 0.45).toFixed(3) + ")"; poly(1.05, 0.45, 0.35); c.fill();
        c.fillStyle = "rgba(226,232,240," + al.toFixed(3) + ")"; poly(1, 0, 0); c.fill();
        c.fillStyle = "rgba(255,255,255," + (al * 0.55).toFixed(3) + ")"; poly(0.38, -0.12, 0); c.fill();
      }
    }
    function clawMark(cat, a, i, v, now) {
      if (petsOn === false || cat.hidden) return;
      let g = a.groups[i];
      if (!g || !g.el.isConnected) { g = a.groups[i] = newMarkGroup(cat, a, i, now); }
      if (!a.stroke) { a.stroke = true; g.passes++; }
      if (v > g.reach || g.passes > 1 && v < 0.05) { g.reach = Math.max(g.reach, v); drawMarkGroup(g); }
    }
    function clawMarksStep(now) {
      for (const g of clawMarks.slice()) {
        const age = now - g.t0;
        if (!g.fading && age > MARK_LIFE) { g.fading = true; g.el.style.opacity = "0"; }
        if (age > MARK_LIFE + MARK_FADE + 150) killMark(g);
      }
    }
    /* ===== 便便：蹲下 → 轉身低頭聞 → 背對用後腳扒砂蓋起來 =====
       便便和沙堆跟爪痕一樣：固定在畫面上、在貓這一層、不擋點擊、最多 3 堆、約 10 秒後淡出 */
    const POOP_FIRST = [240000, 420000], POOP_GAP = [480000, 840000], POOP_ROOM_GAP = 120000;
    let lastPoopAt = -1e9;
    const PT = { squat: 2000, drop: 1250, turn: 300, sniff: 1100, bury: 1800 };
    const POOP_MAX = 3, POOP_LIFE = 10000, POOP_FADE = 1800, PW = 64, PH = 46;
    const poops = [];
    const gxOff = (dir, gx, k) => (dir < 0 ? W - gx : gx) * S * (k || 1);
    function poopSpot(cat) {
      let best = null;
      for (let k = 0; k < 10; k++) {
        const x = clamp(k === 0 ? cat.x : freeSpot(cat), minX() + 2, maxX() - 2);
        if (k && crowded(cat, x)) continue;
        if (poops.some((p) => Math.abs(p.x - (x + W * S / 2)) < W * S * 0.6)) continue;
        if (chatR && underBubble(chatR.left + x + W * S / 2, chatR.top + floorY - 8)) { if (best == null) best = x; continue; }
        best = x; break;
      }
      return best == null ? cat.x : best;
    }
    function killPoop(p) { const i = poops.indexOf(p); if (i >= 0) poops.splice(i, 1); try { p.el.remove(); } catch (_) {} }
    function clearPoops() { for (const p of poops.slice()) killPoop(p); }
    function newPoop(cat, a, now) {
      while (poops.length >= POOP_MAX) killPoop(poops[0]);
      const x = cat.x + gxOff(cat.dir, 2.6, catK(cat));
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const cv = document.createElement("canvas");
      cv.className = "poop-pile";
      cv.width = Math.round(PW * dpr); cv.height = Math.round(PH * dpr);
      cv.style.width = PW + "px"; cv.style.height = PH + "px";
      cv.style.left = Math.round(x - PW / 2) + "px"; cv.style.bottom = "-1px";
      cv.setAttribute("aria-hidden", "true");
      markWrap.appendChild(cv);
      const grains = [];
      for (let j = 0; j < 22; j++) grains.push({ u: Math.random() * 2 - 1, v: Math.random(), c: Math.random() < 0.5 ? "rgba(150,118,70,.55)" : "rgba(255,240,205,.5)" });
      const p = { el: cv, ctx: cv.getContext("2d"), dpr, x, left: Math.round(x - PW / 2), t0: now, cat, act: a, cover: 0, parts: [], grains, coveredAt: 0, fading: false, dirty: true, side: cat.dir };
      poops.push(p);
      return p;
    }
    function drawPoop(p, now) {
      const c = p.ctx, d = p.dpr;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, p.el.width, p.el.height); c.setTransform(d, 0, 0, d, 0, 0);
      const cx = PW / 2, fy = PH - 1;
      const age = now - p.t0, pop = age < 260 ? 0.6 + 0.4 * Math.sin(age / 260 * Math.PI / 2) + 0.12 * Math.sin(age / 260 * Math.PI) : 1;
      const cov = p.cover;
      if (cov < 0.9) {
        c.save(); c.translate(cx, fy); c.scale(pop, pop);
        const tier = (y, rx, ry) => { const g = c.createLinearGradient(0, y - ry, 0, y + ry); g.addColorStop(0, "#a8703f"); g.addColorStop(1, "#6b4122"); c.fillStyle = g; c.beginPath(); c.ellipse(0, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
        tier(-2.4, 7.2, 2.7); tier(-5.9, 5.4, 2.4); tier(-9.0, 3.6, 2.1);
        c.fillStyle = "#8d5a30"; c.beginPath(); c.moveTo(-1.6, -10.2); c.quadraticCurveTo(0.6, -14.6, 2.6, -12.6); c.quadraticCurveTo(1.0, -11.2, 1.8, -9.6); c.closePath(); c.fill();
        c.strokeStyle = "rgba(255,230,200,.55)"; c.lineWidth = 0.9; c.lineCap = "round";
        c.beginPath(); c.ellipse(-2.2, -3.4, 3.2, 0.9, -0.15, Math.PI * 1.05, Math.PI * 1.6); c.stroke();
        c.beginPath(); c.ellipse(-1.4, -6.8, 2.2, 0.7, -0.15, Math.PI * 1.05, Math.PI * 1.6); c.stroke();
        c.restore();
      }
      const sa = Math.max(0, 1 - cov * 2.2) * Math.min(1, age / 400);
      if (sa > 0.02) {
        c.strokeStyle = "rgba(170,205,120," + (0.75 * sa).toFixed(3) + ")"; c.lineWidth = 1.1; c.lineCap = "round";
        for (let k = -1; k <= 1; k++) {
          const ph = now / 260 + k * 1.7, bx = cx + k * 5.2, by = fy - 15 - Math.abs(k) * 0.8 + Math.sin(now / 900 + k) * 0.8;
          c.beginPath();
          for (let s2 = 0; s2 <= 10; s2++) { const t = s2 / 10, X = bx + Math.sin(ph + t * 5.5) * 1.5, Y = by - t * 11; s2 ? c.lineTo(X, Y) : c.moveTo(X, Y); }
          c.stroke();
        }
      }
      if (cov > 0) {
        const mh = 2 + 9.5 * Math.min(1, cov), mw = 7.5 + 4.5 * Math.min(1, cov);
        const g = c.createLinearGradient(0, fy - mh, 0, fy);
        g.addColorStop(0, "#e9d3a4"); g.addColorStop(1, "#bd9a63");
        c.fillStyle = g;
        c.beginPath(); c.moveTo(cx - mw - 3, fy); c.bezierCurveTo(cx - mw + 1, fy - mh * 0.95, cx + mw - 1, fy - mh * 1.05, cx + mw + 3, fy); c.closePath(); c.fill();
        for (const q of p.grains) { const gx = cx + q.u * mw * 0.85, top = fy - mh * (1 - q.u * q.u) * 0.9; const gy = top + (fy - top) * q.v; if (gy < fy - 0.5) { c.fillStyle = q.c; c.fillRect(gx, gy, 0.9, 0.9); } }
      }
      for (const q of p.parts) { c.fillStyle = q.c; c.globalAlpha = Math.max(0, Math.min(1, q.life / 0.15)); c.beginPath(); c.arc(q.x, q.y, q.r, 0, Math.PI * 2); c.fill(); }
      c.globalAlpha = 1;
    }
    function poopKick(p, cat, now) {
      const paw = cat.x + gxOff(cat.dir, 1.4, catK(cat)) - p.left, back = -cat.dir;
      for (let j = 0; j < 7; j++) p.parts.push({ x: paw + rand(-1.5, 1.5), y: PH - 2 - rand(0, 2), vx: back * rand(12, 42), vy: -rand(50, 110), r: rand(0.6, 1.2), life: rand(0.45, 0.8), c: Math.random() < 0.6 ? "#d9bd8a" : "#f0dfb8" });
    }
    function poopStep(cat, a, now) {
      cat.y = 0;
      const e = now - a.t0;
      const T1 = PT.squat, T2 = T1 + PT.turn, T3 = T2 + PT.sniff, T4 = T3 + PT.turn, T5 = T4 + PT.bury;
      if (a.dir0 == null) { a.dir0 = cat.dir; a.x0 = cat.x; a.fi = 0; a.kick = -1; }
      if (e < T1) {
        a.fi = 0;
        if (!a.pile && e >= PT.drop) { a.pile = newPoop(cat, a, now); }
      } else if (e < T2) {
        if (!a.pile) a.pile = newPoop(cat, a, now);
        if (a.ph !== 1) { a.ph = 1; cat.dir = -a.dir0; a.xa = cat.x; a.xb = clamp(a.pile.x - gxOff(cat.dir, 27.6, catK(cat)), minX(), maxX()); }
        a.fi = -1; cat.x = lerpC(a.xa, a.xb, (e - T1) / PT.turn);
      } else if (e < T3) {
        if (a.ph !== 2) { a.ph = 2; cat.x = a.xb; }
        a.fi = Math.floor((e - T2) / 260) % 2 ? 2 : 1;
      } else if (e < T4) {
        if (a.ph !== 3) { a.ph = 3; cat.dir = a.dir0; a.xa = cat.x; a.xb = clamp(a.pile.x - gxOff(cat.dir, -2.2, catK(cat)), minX(), maxX()); }
        a.fi = -1; cat.x = lerpC(a.xa, a.xb, (e - T3) / PT.turn);
      } else if (e < T5) {
        if (a.ph !== 4) { a.ph = 4; cat.x = a.xb; }
        const k = Math.floor((e - T4) / 230);
        a.fi = k % 2 ? 4 : 3;
        if (k !== a.kick) { a.kick = k; if (a.pile && a.pile.el.isConnected && petsOn !== false) poopKick(a.pile, cat, now); }
        if (a.pile) { a.pile.cover = Math.max(a.pile.cover, Math.min(1, (e - T4) / (PT.bury * 0.92))); a.pile.dirty = true; }
      } else {
        if (a.pile) { a.pile.cover = 1; a.pile.dirty = true; }
        a.fi = -1;
        cat.queue = [{ type: "sit", dur: rand(2200, 3600) }];
        finish(cat, now);
        say(cat, "sparkle", now, 0.6);
      }
    }
    let poopLast = 0;
    function poopPilesStep(now) {
      const dt = Math.min(0.05, Math.max(0, (now - (poopLast || now)) / 1000)); poopLast = now;
      for (const p of poops.slice()) {
        const age = now - p.t0;
        if (age > 30000 || !p.el.isConnected) { killPoop(p); continue; }
        /* 被打斷（球雨、關開關、其他事）：沙堆很快自己蓋好 */
        if (p.cover < 1 && p.cat.act !== p.act) { p.cover = Math.min(1, p.cover + dt / 0.5); p.dirty = true; }
        if (p.cover >= 1 && !p.coveredAt) p.coveredAt = now;
        if (p.parts.length) {
          for (const q of p.parts) { q.vy += 420 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; if (q.y > PH - 1.5) { q.y = PH - 1.5; q.vx *= 0.3; q.vy = 0; } }
          p.parts = p.parts.filter((q) => q.life > 0);
          p.dirty = true;
        }
        if (p.cover < 0.5 || age < 300) p.dirty = true;
        if (p.dirty && !p.fading) { p.dirty = false; drawPoop(p, now); }
        if (!p.fading && p.coveredAt && now > Math.max(p.t0 + POOP_LIFE, p.coveredAt + 3000)) { p.fading = true; p.el.style.opacity = "0"; p.fadeAt = now; }
        if (p.fading && now - p.fadeAt > POOP_FADE + 150) killPoop(p);
      }
    }
    /* ===== 點貓選單：餵魚／摸肚子／打頭（現在只在自己畫面；動作事件走 window.PetMenu.act，之後可接同步） ===== */
    const SULK_MS = 20000, PET_DUR = { fish: 4900, belly: 5000, bonk: 2500, huff: 1500 };
    const petFx = [];
    function openPetMenu(cat, now) {
      cat.y = 0; cat.queue = [];
      start(cat, { type: "sit", dur: 1e9, tapped: true, menu: true }, now); /* 坐下來看著你，不會走掉 */
      if (chatR == null) geom();
      const hx = chatR.left + cat.x + gxOff(cat.dir, 12.4, catK(cat)), hy = chatR.top + floorY - (H - 2.2) * catS(cat);
      const sulky = now < (cat.sulkUntil || 0);
      if (sulky) { showBubble(cat, now, "anger"); cat.bubbleUntil = now + 1800; }
      window.PetMenu.open({ x: hx, y: hy, id: cat.name, sulky,
        onPick: (id, dim) => window.PetMenu.act({ cat: cat.name, act: dim ? "huff" : id, trap: id === "belly" && Math.random() < 0.3, makeup: sulky && id === "fish" }),
        onClose: (why) => { if (why !== "pick" && cat.act && cat.act.menu) { const n = performance.now(); cat.act = { type: "sit", t0: n, dur: rand(900, 1600) }; } } });
    }
    if (window.PetMenu) window.PetMenu.onAction = (ev) => {
      const cat = cats.find((c) => c.name === ev.cat);
      if (!cat || petsOn === false || cat.hidden) return;
      const n = performance.now(), a0 = cat.act;
      if (a0 && (a0.type === "funny" || a0.type === "poop" || a0.type === "hang" || a0.type === "jump" || a0.type === "bite" || a0.type === "fight")) return;
      if (soc && soc.kind === "fight" && inSoc(cat)) return; /* 正在做別的大事：不硬插 */
      if (!PET_DUR[ev.act]) return;
      try { if (soc && inSoc(cat)) endSoc(n); } catch (_) { soc = null; }
      if (ball.carrier === cat) dropBall(cat, n);
      cat.y = 0;
      if (ev.act === "fish") { /* 魚掉在臉前面：先轉向空間比較大的那邊 */
        const room = (d) => d > 0 ? maxX() - cat.x : cat.x - minX();
        cat.dir = room(1) >= room(-1) ? 1 : -1;
      }
      setAct(cat, { type: "pet", kind: ev.act, dur: PET_DUR[ev.act], tapped: true, trap: !!ev.trap, makeup: !!ev.makeup, fr: "sit" }, n);
      nextSocialAt = Math.max(nextSocialAt, n + 6000); nextBiteAt = Math.max(nextBiteAt, n + 6000);
    };
    function newPetFx(cat, a) {
      const FW = 190, FH = 170, dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const cv = document.createElement("canvas");
      cv.className = "pet-fx"; cv.width = Math.round(FW * dpr); cv.height = Math.round(FH * dpr);
      cv.style.width = FW + "px"; cv.style.height = FH + "px";
      const left = Math.round(cat.x + W * S / 2 - FW / 2);
      cv.style.left = left + "px";
      layer.appendChild(cv);
      const fx = { el: cv, ctx: cv.getContext("2d"), dpr, FW, FH, left, cat, act: a, texts: [], hearts: [] };
      petFx.push(fx);
      return fx;
    }
    function killPetFx(fx) { const i = petFx.indexOf(fx); if (i >= 0) petFx.splice(i, 1); try { fx.el.remove(); } catch (_) {} try { fx.cat.body.style.scale = ""; } catch (_) {} } /* 開頭的小縮放被打斷也要還原 */
    function clearPetFx() { for (const f of petFx.slice()) killPetFx(f); }
    function petFxStep(now) { for (const f of petFx.slice()) if (f.cat.act !== f.act || petsOn === false) killPetFx(f); } /* 被打斷（球雨、關貓、看門狗）就收掉 */
    /* 格子座標 → 特效畫布座標 */
    const fxX = (fx, cat, gx) => cat.x + gxOff(cat.dir, gx, catK(cat)) - fx.left;
    const fxY = (fx, cat, gy) => fx.FH - (H - gy) * catS(cat) - cat.y;
    function fxText(fx, txt, x, y, now, o) { fx.texts.push(Object.assign({ txt, x, y, t0: now, life: 1100, size: 12, col: "#fff" }, o || {})); }
    function fxHeart(fx, x, y, now) { fx.hearts.push({ x, y, t0: now, life: 1300, dx: rand(-6, 6), s: rand(0.8, 1.15) }); }
    function heartPath(c, x, y, s) { c.beginPath(); c.moveTo(x, y + 2.6 * s); c.bezierCurveTo(x - 4.6 * s, y - 0.6 * s, x - 2.4 * s, y - 4.4 * s, x, y - 1.6 * s); c.bezierCurveTo(x + 2.4 * s, y - 4.4 * s, x + 4.6 * s, y - 0.6 * s, x, y + 2.6 * s); c.closePath(); }
    function drawFish(c, x, y, s, dir, eaten) {
      /* 小魚（銀藍色、圓滾滾）；本地座標 -x＝魚頭。吃掉的部分從魚頭（靠貓嘴那端）一口一口往魚尾不見 */
      c.save(); c.translate(x, y); c.scale(dir * s, s);
      c.beginPath(); c.moveTo(6.4, 0); c.lineTo(10.2, -3.6); c.quadraticCurveTo(9.3, 0, 10.2, 3.6); c.closePath(); c.fillStyle = "#6fb6e6"; c.fill();
      const g = c.createLinearGradient(0, -4, 0, 4); g.addColorStop(0, "#9ad4fb"); g.addColorStop(0.55, "#d8eefc"); g.addColorStop(1, "#7cbde8");
      c.beginPath(); c.ellipse(0, 0, 7.4, 3.9, 0, 0, Math.PI * 2); c.fillStyle = g; c.fill();
      c.strokeStyle = "rgba(40,90,130,.5)"; c.lineWidth = 0.6; c.stroke();
      c.strokeStyle = "rgba(60,120,170,.55)"; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-2.4, -3.3); c.quadraticCurveTo(-1.2, 0, -2.4, 3.3); c.stroke();
      c.fillStyle = "#173045"; c.beginPath(); c.arc(-4.4, -0.8, 0.9, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(-4.65, -1.05, 0.3, 0, Math.PI * 2); c.fill();
      if (eaten > 0) { /* 被咬掉的部分（從魚頭開始），咬痕是圓弧 */
        c.globalCompositeOperation = "destination-out";
        const k = Math.min(1, eaten), e = fishEdge(k);
        c.beginPath(); c.rect(-12, -6, e + 12, 12); c.fill();
        for (const dy of [-2.6, 0, 2.6]) { c.beginPath(); c.arc(e, dy, 1.6, 0, Math.PI * 2); c.fill(); }
        c.globalCompositeOperation = "source-over";
      }
      c.restore();
    }
    const fishEdge = (k) => -8 + k * 19; /* 吃掉比例 → 咬痕在魚身上的位置（本地 x） */
    function drawBone(c, x, y, s, dir, al, upto) {
      c.save(); c.globalAlpha = al; c.translate(x, y); c.scale(dir * s, s);
      if (upto != null) { c.beginPath(); c.rect(-12, -6, upto + 12, 12); c.clip(); } /* 只露出已經吃掉那段的魚骨 */
      c.strokeStyle = "#eef1f4"; c.lineCap = "round"; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(-5, 0); c.lineTo(6.6, 0); c.stroke();
      for (let k = -3; k <= 4; k += 1.4) { c.beginPath(); c.moveTo(k, -2.6); c.lineTo(k + 0.6, 0); c.lineTo(k, 2.6); c.stroke(); }
      c.beginPath(); c.moveTo(6.6, 0); c.lineTo(9.6, -2.6); c.moveTo(6.6, 0); c.lineTo(9.6, 2.6); c.stroke();
      c.beginPath(); c.ellipse(-6.2, 0, 1.8, 2.3, 0, 0, Math.PI * 2); c.stroke();
      c.fillStyle = "#eef1f4"; c.beginPath(); c.arc(-6.4, -0.6, 0.45, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    function drawHand(c, x, y, rot, s, fist) {
      /* 卡通小手（膚色、圓圓的，手指朝下）；打頭時是軟軟的小拳頭 */
      c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
      c.fillStyle = "#f6c8a8"; c.strokeStyle = "#c98e72"; c.lineWidth = 0.9; c.lineJoin = "round";
      c.beginPath(); c.moveTo(-5, -16); c.lineTo(-5, -8); c.lineTo(5, -8); c.lineTo(5, -16); c.closePath(); c.fillStyle = "#8fa3c8"; c.fill(); /* 袖口 */
      c.fillStyle = "#f6c8a8";
      if (fist) {
        c.beginPath(); c.roundRect ? c.roundRect(-6, -9, 12, 11, 4.5) : c.rect(-6, -9, 12, 11); c.fill(); c.stroke();
        c.beginPath(); for (const k of [-2.6, 0, 2.6]) { c.moveTo(k, -1.2); c.lineTo(k, 1.8); } c.stroke();
      } else {
        c.beginPath(); c.ellipse(0, -3, 5.6, 6, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        for (const [fx2, len] of [[-3.6, 4.6], [-1.2, 5.6], [1.2, 5.6], [3.6, 4.4]]) { c.beginPath(); c.ellipse(fx2, 2.4 + len / 2, 1.25, len / 2 + 0.6, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
        c.beginPath(); c.ellipse(-6.2, -1.2, 1.4, 3, 0.7, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.ellipse(0, -2.6, 5.2, 5.4, 0, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    }
    function drawStar(c, x, y, r, rot, al) {
      c.save(); c.globalAlpha = al; c.translate(x, y); c.rotate(rot); c.fillStyle = "#ffd34d"; c.strokeStyle = "#b8860b"; c.lineWidth = 0.6;
      c.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * 0.45 : r, an = -Math.PI / 2 + k * Math.PI / 5; k ? c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) : c.moveTo(Math.cos(an) * rr, Math.sin(an) * rr); } c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
    function fxDrawCommon(fx, now) {
      const c = fx.ctx;
      for (const h of fx.hearts) { const u = (now - h.t0) / h.life; if (u < 0 || u > 1) continue; c.save(); c.globalAlpha = Math.min(1, (1 - u) * 1.6); heartPath(c, h.x + h.dx * u + Math.sin(u * 9) * 1.5, h.y - u * 34, 1.5 * h.s * (0.7 + 0.3 * Math.min(1, u * 4))); c.fillStyle = "#ff6b8b"; c.fill(); c.restore(); }
      fx.hearts = fx.hearts.filter((h) => now - h.t0 < h.life);
      for (const t of fx.texts) {
        const u = (now - t.t0) / t.life; if (u < 0 || u > 1) continue;
        const pop = u < 0.15 ? 0.6 + u / 0.15 * 0.5 : u < 0.25 ? 1.1 - (u - 0.15) : 1;
        c.save(); c.globalAlpha = Math.min(1, (1 - u) * 2.2); c.translate(t.x, t.y - u * (t.rise != null ? t.rise : 14)); c.scale(pop, pop); c.rotate(t.rot || 0);
        c.font = "800 " + t.size + "px system-ui, -apple-system, 'PingFang TC', 'Noto Sans TC', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
        c.lineWidth = 3; c.lineJoin = "round"; c.miterLimit = 2; c.strokeStyle = "rgba(20,22,28,.9)"; c.strokeText(t.txt, 0, 0); c.fillStyle = t.col; c.fillText(t.txt, 0, 0);
        c.restore();
      }
      fx.texts = fx.texts.filter((t) => now - t.t0 < t.life);
    }
    function petStep(cat, a, now) {
      const e = now - a.t0;
      if (!a.fx) a.fx = newPetFx(cat, a);
      const fx = a.fx, c = fx.ctx, d = fx.dpr;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, fx.el.width, fx.el.height); c.setTransform(d, 0, 0, d, 0, 0);
      cat.y = 0;
      if (a.kind === "fish") {
        /* 魚掉到臉前面 → 低頭聞 → 啊嗚啊嗚吃（魚越來越小，剩魚骨）→ 舔嘴 → 瞇眼滿足 */
        const T = { drop: 550, sniff: 1150, eat: 3000, lick: 3800 };
        const FS = 1.25, BITES = 5, KMAX = 0.74; /* 咬 5 口，留下魚尾巴＋魚骨 */
        const fdir = cat.dir; /* 魚頭朝貓嘴（drawFish 的 dir＝貓的方向：本地 -x 的魚頭朝向貓） */
        a.fishX = fxX(fx, cat, 29.6); a.fishY = fxY(fx, cat, 20) - 4.2; /* 每格都跟著貓的位置 */
        /* 已經吃掉多少：每一口（eat1 低頭咬下去那格）加一段，咬下去的 90ms 內很快補上 */
        const eatenAt = (t) => {
          if (t < T.sniff) return 0;
          const k = Math.floor((t - T.sniff) / 190), into = (t - T.sniff) - k * 190;
          const done = Math.floor(k / 2) + (k % 2 ? Math.min(1, into / 90) : 0);
          return Math.min(KMAX, done / BITES * KMAX);
        };
        /* 吃掉的那段越長，魚被叼著往貓這邊拉一點，咬痕一直在嘴邊 */
        const pull = (k) => (fishEdge(k) - fishEdge(0)) * FS * 0.5 * -fdir;
        if (e < T.drop) {
          a.fr = "walk";
          const u = e / T.drop, yy = u < 0.8 ? a.fishY - 70 * (1 - u / 0.8) * (1 - u / 0.8) : a.fishY - Math.sin((u - 0.8) / 0.2 * Math.PI) * 4;
          drawFish(c, a.fishX, yy, FS, fdir, 0);
        } else if (e < T.sniff) {
          a.fr = Math.floor((e - T.drop) / 230) % 2 ? "sniff1" : "sniff0";
          drawFish(c, a.fishX, a.fishY, FS, fdir, 0);
          if (!a.q1) { a.q1 = 1; showBubble(cat, now, "question"); cat.bubbleUntil = now + 700; }
        } else if (e < T.eat) {
          const k = Math.floor((e - T.sniff) / 190);
          a.fr = k % 2 ? "eat1" : "eat0";
          const ek = eatenAt(e), x = a.fishX + pull(ek);
          drawFish(c, x, a.fishY, FS, fdir, ek);
          drawBone(c, x, a.fishY, FS, fdir, 1, fishEdge(ek)); /* 吃掉的地方露出魚骨 */
          if (k !== a.lastK && k % 2 === 1) { a.lastK = k; if ((k >> 1) % 2 === 0) fxText(fx, "啊嗚", fxX(fx, cat, 24) + rand(-4, 4), fxY(fx, cat, 9), now, { size: 11, col: "#ffe08a", life: 700 }); }
        } else {
          a.fr = e < T.lick ? (Math.floor((e - T.eat) / 260) % 2 ? "lick" : "content") : "content";
          const al = Math.max(0, 1 - (e - T.eat) / 1300), x = a.fishX + pull(KMAX);
          if (al > 0) { c.save(); c.globalAlpha = al; drawFish(c, x, a.fishY, FS, fdir, KMAX); c.restore(); drawBone(c, x, a.fishY, FS, fdir, al, fishEdge(KMAX)); } /* 剩魚尾巴＋魚骨，慢慢淡掉 */
          if (!a.h1 && e > T.lick) { a.h1 = 1; showBubble(cat, now, "heart"); cat.bubbleUntil = now + 1100; if (a.makeup) cat.sulkUntil = 0; }
        }
      } else if (a.kind === "belly") {
        /* 直接正面仰躺、肚皮朝鏡頭（開頭輕輕縮放一下）→ 小手在肚子上繞圈揉（按的地方凹下去、皮膚被推著走）
           → 瞇眼、腳掌踩奶、尾巴輕擺、飄愛心和「呼嚕」；30%：四腳抱住手、後腳亂蹬 → 最後直接回坐姿 */
        { const u = Math.min(1, e / 180), k = e < 180 ? 0.92 + 0.08 * (1 - (1 - u) * (1 - u)) : 1; /* 很短的「噗」一下：從 92% 放大到 100% */
          cat.body.style.scale = k < 1 ? String(k) : ""; cat.body.style.transformOrigin = k < 1 ? "50% 100%" : ""; }
        const IN = 150, TR = 2800, END = 4300, OUT = a.dur - 260; /* 按下就直接正面仰躺（不翻滾、沒有四腳朝天的側面幀），結尾直接回坐姿 */
        const trap = a.trap && e >= TR && e < END;
        const th = Math.max(0, e - IN) / 1050 * Math.PI * 2; /* 一圈約 1 秒 */
        if (e >= OUT) a.fr = "sit";
        else if (trap) a.fr = Math.floor((e - TR) / 110) % 2 ? "rubT1" : "rubT0";
        else a.fr = "rub" + (((Math.round(th / (Math.PI * 2 / REAL.RUB_N)) % REAL.RUB_N) + REAL.RUB_N) % REAL.RUB_N);
        const rot0 = -cat.dir * 1.32; /* 手從尾巴那一側的斜上方伸過來 */
        const sx = Math.sin(rot0), cy0 = Math.cos(rot0);
        const at = (gx, gy) => ({ x: fxX(fx, cat, gx), y: fxY(fx, cat, gy) });
        const handAt = (pt, rot, sc, off) => { /* 手掌心（本地 0,1）貼在 pt 上；off＝沿袖子方向退開多少 px */
          const L = 4.2; /* 指腹（本地 y≈4）按在肚子上，手掌在外面，看得到按下去的凹痕 */
          const ox = pt.x + L * sc * Math.sin(rot) + Math.sin(rot) * off, oy = pt.y - L * sc * Math.cos(rot) - Math.cos(rot) * off;
          drawHand(c, ox, oy, rot, sc, false);
        };
        if (e >= IN && e < OUT) {
          const pr = REAL.rubPress(th), pt = at(pr.x, pr.y);
          const wob = Math.sin(th) * 0.12;
          let off = 0;
          if (e < IN + 260) off = (1 - (e - IN) / 260) * 42;
          if (!a.trap && e > END - 260) off = Math.min(1, (e - (END - 260)) / 320) * 48;
          if (a.trap && e >= END) off = Math.min(1, (e - END) / 200) * 60;
          if (trap) { const q = at(14.6 + Math.sin(e / 35) * 0.5, 14.2 + Math.cos(e / 47) * 0.4); handAt(q, rot0 + Math.sin(e / 60) * 0.22, 0.76, 0); }
          else if (off < 58) {
            handAt(a.trap && e >= END ? at(14.6, 14.2) : pt, rot0 + wob, 0.76 + Math.cos(th * 2) * 0.03, Math.max(0, off));
            if (off < 4 && !(a.trap && e >= END)) { /* 軟嫩感：指尖前面的肚皮被推出兩道小弧（往手移動的方向） */
              const hr = rot0 + wob, fa = Math.atan2(Math.cos(hr), -Math.sin(hr)), pu = 0.6 + 0.4 * Math.abs(Math.sin(th * 2)); /* 指尖朝的方向 */
              const fx0 = pt.x + Math.cos(fa) * 4.6, fy0 = pt.y + Math.sin(fa) * 4.6;
              c.save();
              const dg = c.createRadialGradient(fx0, fy0, 0.3, fx0, fy0, 4.2); /* 指尖前面一小塊凹下去的陰影 */
              dg.addColorStop(0, "rgba(125,72,35," + (0.38 * pu).toFixed(3) + ")"); dg.addColorStop(1, "rgba(125,72,35,0)");
              c.fillStyle = dg; c.beginPath(); c.ellipse(fx0, fy0, 4.2, 3.0, fa, 0, Math.PI * 2); c.fill();
              c.strokeStyle = "rgba(255,248,236," + (0.85 * pu).toFixed(3) + ")"; c.lineWidth = 1.05; c.lineCap = "round"; /* 被推起來的肚皮（亮弧） */
              for (const r of [5.9, 8.0]) { c.beginPath(); c.arc(pt.x, pt.y, r, fa - 0.62, fa + 0.62); c.stroke(); }
              c.restore();
            }
          }
        }
        if (e > IN + 200 && !trap && e < END) { const k = Math.floor((e - IN - 200) / 520); if (k !== a.lastH) { a.lastH = k; fxHeart(fx, fxX(fx, cat, k % 2 ? 21.5 : 8.5) + rand(-3, 3), fxY(fx, cat, 8.5), now); if (k % 2 === 0) fxText(fx, "呼嚕", fxX(fx, cat, 23.5) + rand(-3, 3), fxY(fx, cat, 7.2), now, { size: 11, col: "#ffd6e7", life: 1000, rise: 16, rot: rand(-0.15, 0.15) }); } }
        if (trap && !a.g1) { a.g1 = 1; showBubble(cat, now, "bang"); cat.bubbleUntil = now + 1200; const p0 = at(14.8, 13.0); fxText(fx, "抓到了！", p0.x - 30 * cat.dir, p0.y - 34, now, { size: 12, col: "#ffe08a", life: 1200, rise: 10 }); }
      } else if (a.kind === "bonk" || a.kind === "huff") {
        /* 輕輕一下「咚」：頭上轉星星、耳朵往後貼、閉眼生氣、尾巴甩，然後轉身走開，之後 20 秒還在生氣 */
        const hx = fxX(fx, cat, 12.4), hy = fxY(fx, cat, 3.6), hc = fxY(fx, cat, 4.9) - 3; /* hc：拳頭剛好碰到頭頂 */
        const HIT = a.kind === "bonk" ? 360 : -1, ANG = a.kind === "bonk" ? 700 : 0;
        if (a.kind === "bonk") {
          if (e < HIT) { a.fr = "sit"; const u = e / HIT; drawHand(c, hx + 2, hc - 34 * (1 - u * u), 0.12, 1, true); }
          else if (e < ANG) { a.fr = "bonkHit"; const u = (e - HIT) / (ANG - HIT); drawHand(c, hx + 2, hc - (u < 0.25 ? 0 : (u - 0.25) / 0.75) * 50, 0.12 + u * 0.3, 1, true); if (!a.d1) { a.d1 = 1; fxText(fx, "咚", hx + 16, hy - 12, now, { size: 14, col: "#fff3bf", life: 900, rise: 8, rot: 0.15 }); } }
          if (e >= HIT && e < 2300) { const al = Math.min(1, (2300 - e) / 400); for (let k = 0; k < 3; k++) { const an = e / 260 + k * 2.094; drawStar(c, hx + Math.cos(an) * 10, hy - 3 + Math.sin(an) * 3.2, 2.6, e / 200 + k, al); } }
        }
        if (e >= ANG) { a.fr = Math.floor((e - ANG) / 170) % 2 ? "angry1" : "angry0"; if (!a.an) { a.an = 1; showBubble(cat, now, "anger"); cat.bubbleUntil = now + 1600; } }
        if (e > a.dur - 700 && !a.hm) { a.hm = 1; fxText(fx, "哼！", hx - 14 * cat.dir, hy - 8, now, { size: 13, col: "#ffc9c9", life: 900, rise: 10 }); }
      }
      fxDrawCommon(fx, now);
      if (e >= a.dur) {
        const kind = a.kind;
        killPetFx(fx); a.fx = null;
        if (kind === "bonk" || kind === "huff") {
          /* 轉身不理你，走遠一點；之後 20 秒點牠：選單中間顯示「還在生氣…」，只有餵魚能和好 */
          cat.sulkUntil = performance.now() + SULK_MS;
          const far = cat.x - minX() > maxX() - cat.x ? minX() + rand(0, 30) : maxX() - rand(0, 30);
          cat.dir = far > cat.x ? 1 : -1;
          cat.queue = [Object.assign(moveAct("walk", far, rand(48, 60)), { tapped: true }), { type: "loaf", dur: rand(3000, 5000) }];
        } else cat.queue = kind === "belly" ? [{ type: "sit", dur: rand(1200, 2000) }] : [{ type: "sit", dur: rand(1500, 2400) }];
        finish(cat, now);
      }
    }
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
      } else if (a.type === "sleep" || a.type === "lie") {
        if (!a.keepDir && Math.random() < 0.5) cat.dir = -cat.dir;
      }
      if (a.face) cat.dir = a.face;
      /* 要往反方向走：先原地轉身，再往前走（不會倒退走） */
      if (cat.dir !== d0 && MOVE_TYPES[a.type]) cat.turnUntil = now + 150;
      cat.act = a;
    }

    function finish(cat, now) {
      if (cat.kit) { cat.act = { type: "sit", t0: now, dur: rand(400, 1100) }; return; }
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
      if (cat.talking) return;
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
      if (cat.talking) hideTalk(cat, now);
    }
    /* 互動時的泡泡：在地上才冒，半空中不冒 */
    function say(cat, icon, now, p) {
      if (p != null && Math.random() > p) return;
      if (cat.y > 0.5 || cat.hidden) return;
      showBubble(cat, now, icon);
    }

    /* 灰貓、黑貓各有幾句，每次隨機說一句，不連說同一句。樣式沿用心情泡泡的白底黑邊小尾巴。 */
    const CAT_TALK = {
      gray: ["小麥我愛你~喵", "小麥摸摸我~喵", "肚子餓了~喵", "想睡覺了~喵"],
      brown: ["辛巴我愛妳~喵", "辛巴抱抱~喵", "陪我玩球~喵", "今天也很可愛~喵"],
    };
    function pickTalk(cat) {
      const lines = CAT_TALK[cat.name];
      if (!lines || !lines.length) return "";
      const pool = lines.length > 1 && cat.lastTalk ? lines.filter((t) => t !== cat.lastTalk) : lines;
      const text = pick(pool);
      cat.lastTalk = text;
      return text;
    }
    const TALK_MS = 3000;
    function talkingBusy() { return cats.some((c) => c.talking); }
    function canTalk(cat, now) {
      if (petsOn === false || !cat || cat.hidden || cat.y > 0.5) return false;
      if (cat.talking || talkingBusy()) return false;
      if (window.PetMenu && window.PetMenu.isOpen) return false;
      if (ball.state === "drag") return false;
      const t = cat.act && cat.act.type;
      if (cat.act && cat.act.menu) return false;
      if (t === "pet" || t === "bite" || t === "hang" || t === "fight" || t === "funny" || t === "poop") return false;
      return true;
    }
    function hideTalk(cat, now) {
      cat.say.classList.remove("show");
      cat.say.textContent = "";
      cat.talking = false;
      cat.sayUntil = 0;
      cat.nextTalk = now + rand(45000, 90000);
    }
    function showTalk(cat, now, force) {
      const text = pickTalk(cat);
      if (!text) return false;
      if (!force && !canTalk(cat, now)) return false;
      for (const o of cats) if (o !== cat && o.talking) hideTalk(o, now);
      if (cat.bubbleUntil) { cat.bubble.classList.remove("show"); cat.bubbleUntil = 0; }
      cat.say.textContent = text;
      cat.say.classList.remove("show");
      void cat.say.offsetWidth;
      cat.say.classList.add("show");
      cat.talking = true;
      cat.sayUntil = now + TALK_MS;
      return true;
    }
    function talkStep(cat, now) {
      if (cat.talking) {
        if (now > cat.sayUntil) hideTalk(cat, now);
        return;
      }
      if (now <= (cat.nextTalk || 0)) return;
      if (canTalk(cat, now)) showTalk(cat, now);
      else cat.nextTalk = now + rand(800, 2000);
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
      if (!a || a.tapped || a.type === "jump" || a.type === "bite" || a.type === "hang" || a.type === "claw" || a.type === "funny" || a.type === "poop" || c.pendingTap) return false;
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
      const gray = cats.find((c) => c.name === "gray");
      const grayDown = !!(gray && gray.act && (gray.act.type === "sleep" || gray.act.type === "lie" || gray.act.type === "loaf"));
      const k = weighted({ chase: 24, fight: fightOK(now) ? 3 : 0, follow: 18, cuddle: 26, faceoff: 10, love: 12, climb: grayDown ? 22 : 6 });
      for (const c of cats) hideBubble(c, now);
      if (k === "chase") { const c = pick(cats); startChase(c, other(c), now); }
      else if (k === "fight") startFight(now);
      else if (k === "follow") startFollow(now);
      else if (k === "cuddle") startCuddle(now);
      else if (k === "love") startLove(now);
      else if (k === "climb") startClimb(now);
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
      } else if (s.kind === "climb") {
        climbStep(now);
      } else if (s.kind === "faceoff" && s.phase === "stare" && now > s.until) {
        /* 對看一下，然後一隻撲過去，另一隻逃跑 → 變成追逐 */
        const p = pick([s.a, s.b]), q = other(p);
        startChase(p, q, now, { wait: rand(100, 200) });
      }
    }

    /* ----- 點一下貓：那隻坐下、冒愛心，一會兒再回去自己玩 ----- */
    function tapSit(cat, now) {
      if (cat.act && (cat.act.type === "funny" || cat.act.type === "poop" || cat.act.type === "pet" || cat.act.type === "bite")) return; /* 僵住、便便、反應、咬泡泡：點了不理 */
      if (soc && soc.kind === "fight" && inSoc(cat)) return; /* 打架中不開選單 */
      if (cat.act && cat.act.menu) { try { if (window.PetMenu) window.PetMenu.close("same"); } catch (_) {} return; }
      if (soc && inSoc(cat)) endSoc(now);
      if (cat.act && cat.act.type === "jump") { cat.pendingTap = true; return; }
      /* 吊在泡泡上被點：先掉下來，落地後再開選單 */
      if (cat.act && cat.act.type === "hang" && cat.act.phase !== "sit") { cat.pendingTap = true; cat.act.drop = true; if (cat.act.phase !== "crouch" && cat.act.phase !== "rise" && cat.act.phase !== "hang" && cat.act.phase) return; hangDrop(cat, cat.act, now); return; }
      cat.y = 0;
      cat.queue = [];
      if (ball.carrier === cat) dropBall(cat, now);
      nextSocialAt = Math.max(nextSocialAt, now + 3500);
      if (!window.PetMenu || petsOn === false) { start(cat, { type: "sit", dur: rand(2600, 3400), tapped: true }, now); showBubble(cat, now, "heart"); cat.bubbleUntil = now + 2400; return; }
      openPetMenu(cat, now);
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
      if (e.target && e.target.closest && e.target.closest(".pet-menu, .pet-btn")) return;
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
        case "funny": return fr.funny[a.k] || fr.sit[0];
        case "poop": return a.fi >= 0 ? fr.poop[a.fi] || fr.walk[0] : fr.walk[0];
        case "pet": return a.fr === "sit" ? fr.sit[0] : a.fr === "walk" ? fr.walk[0] : a.fr === "sniff0" ? fr.poop[1] : a.fr === "sniff1" ? fr.poop[2] : fr.pet[REAL.PET_KEYS.indexOf(a.fr)] || fr.sit[0];
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
        case "lie": return fr.lie[a.fi] || fr.lie[0];
        case "rear": return fr.rear[a.fi] || fr.rear[0];
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
      if (a.type === "claw") { clawStep(cat, a, now); return; }
      if (a.type === "funny") { funnyStep(cat, a, now); return; }
      if (a.type === "poop") { poopStep(cat, a, now); return; }
      if (a.type === "pet") { petStep(cat, a, now); return; }
      if (a.type === "walk" || a.type === "run") {
        const d = a.tx - cat.x;
        const speed = (cat.pregnant && cat.name === "gray" && !cat.kit) ? a.speed * 0.62 : a.speed;
        if (a.exit || a.enter) {
          if (Math.abs(d) <= speed * dt) {
            cat.x = a.tx;
            a.done = true;
            if (a.enter) finish(cat, now);
            return;
          }
          cat.x += Math.sign(d) * speed * dt;
          return;
        }
        if (a.done || Math.abs(d) <= speed * dt) { cat.x = a.tx; finish(cat, now); return; }
        cat.x += Math.sign(d) * speed * dt;
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
      talkStep(cat, now);
      /* 心情泡泡：偶爾、隨機出現；半空中和煙霧團裡不冒 */
      if (cat.talking) return;
      if (cat.bubbleUntil && now > cat.bubbleUntil) {
        hideBubble(cat, now);
        if (soc && inSoc(cat)) cat.nextBubble = now + rand(1800, 4000);
      } else if (!cat.bubbleUntil && now > cat.nextBubble) {
        const t = cat.act.type;
        let chance = t === "sleep" ? 0.85 : t === "run" || t === "jump" || t === "fight" ? 0 : 0.6;
        if (t === "chase" || t === "flee") chance = 0.45;
        if (cat.hidden || t === "pet" || (t === "hang" && cat.act.phase !== "sit")) chance = 0;
        if (Math.random() < chance) showBubble(cat, now, t === "chase" || t === "flee" ? pick(PLAY_ICONS) : (soc && inSoc(cat) && t !== "sleep" ? pick(["heart", "note", "sparkle"]) : null));
        else cat.nextBubble = now + rand(2500, 7000);
      }
    }

    const BONK_MIN_V = 260;
    const BONK_CD = 2500;
    const BONK_OK = { walk: 1, run: 1, sit: 1, loaf: 1, lick1: 1, lick2: 1, lick3: 1, sleep: 1, scratch: 1, claw: 1, stun: 1, ballchase: 1, steal: 1, bonk: 1, chase: 1, follow: 1, flee: 1 };
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
    /* 畫一張影格：先畫會擺動的尾巴，再貼上畫好的身體；靜止時有呼吸起伏、偶爾眨眼；被打到時眼睛變 >< */
    const LIVE_MS = 1000 / 24; /* 尾巴／呼吸／眨眼每秒重畫 24 次就夠順，也省電 */
    const STILL_ANIM = { sit: 1, love: 1, sleep: 1, lie: 1, rear: 1, lick1: 1, lick2: 1, lick3: 1, scratch: 0 };
    /* 搭住時黑貓腰部快速小幅擺動（約 5Hz）；前腳仍搭在肩上、後腳仍踩在地板上 */
    function rearHipSway(cat, now) {
      const a = cat.act;
      if (!a || a.type !== "rear" || a.fi < 2) return 0;
      if (a.hipSway != null) return a.hipSway;
      const s = soc;
      if (!s || s.kind !== "climb" || (s.phase !== "hold" && s.demoPhase !== "hold")) return 0;
      const t0 = s.tHold || s.t0 || now;
      return REAL.CLIMB.hipAmp * Math.sin(2 * Math.PI * REAL.CLIMB.hipHz * ((now - t0) / 1000));
    }
    function liveOf(cat, f, now) {
      const an = f.anim;
      let sway = 1, sp = 1.5, breath = 0;
      if (an === "walk") { sway = 0.65; sp = 5.2; }
      else if (an === "run") { sway = 0.35; sp = 9; }
      else if (an === "jump" || an === "hang") { sway = 0.6; sp = 7; }
      else if (an === "bite") { sway = 0.9; sp = 4.5; }
      else if (an === "sleep" || an === "lie") { sway = an === "lie" ? 0.35 : 0.25; sp = an === "lie" ? 0.9 : 0.7; breath = 0.028 * (0.5 + 0.5 * Math.sin(now / 1000 * Math.PI * 2 / 3.4)); }
      else if (an === "rear") { sway = 0.55; sp = 2.2; breath = 0.01 * (0.5 + 0.5 * Math.sin(now / 1000 * Math.PI * 2 / 2.4)); }
      else if (STILL_ANIM[an]) { breath = 0.012 * (0.5 + 0.5 * Math.sin(now / 1000 * Math.PI * 2 / 2.6 + (cat.name === "gray" ? 1.3 : 0))); }
      const dt = Math.min(0.1, Math.max(0, (now - (cat.liveT || now)) / 1000));
      cat.liveT = now;
      cat.tailPh = (cat.tailPh || 0) + dt * sp;
      /* 眨眼：每 2.5～6.5 秒一次，偶爾連眨兩下 */
      let blink = 0;
      if (now > cat.blinkNext) { cat.blinkT0 = now; cat.blinkNext = now + (Math.random() < 0.2 ? 320 : rand(2500, 6500)); }
      const be = now - cat.blinkT0;
      if (be >= 0 && be < 190) blink = Math.sin(be / 190 * Math.PI);
      return { sway, ph: cat.tailPh, breath, blink };
    }
    function paintCat(ctx, f, bk, w, h, cat, now) {
      const cv = ctx.canvas, R = cv.width / w;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (!f || !f.pose) {
        if (f && f.cv) { ctx.imageSmoothingEnabled = false; ctx.drawImage(f.cv, 0, 0); ctx.imageSmoothingEnabled = true; }
        return;
      }
      now = now || performance.now();
      cat.paintT = now;
      const body = realBody(cat.name, f, bk, w, h);
      const lv = liveOf(cat, f, now);
      const hipSway = rearHipSway(cat, now);
      if (f.pose.kind === "hangFront") {
        /* 仰頭咬住吊著：整隻以咬住點為支點小幅擺盪，四肢和尾巴每格重畫（亂揮亂踢）；
           頭另外畫到前面那張畫布，蓋在被咬的泡泡上面 */
        const tt = now / 1000 + (cat.name === "gray" ? 1.7 : 0), pt = f.pt, sd = cat.name === "gray" ? 2.1 : 0;
        const st = REAL.hangState(tt, sd);
        const head = f.headF ? realBody(cat.name, f.headF, bk, w, h) : null;
        const tf = (c2) => { c2.setTransform(R, 0, 0, R, 0, 0); c2.translate(pt.x, pt.y); c2.rotate(st.rot); c2.translate(-pt.x, -pt.y); };
        tf(ctx);
        ctx.save(); REAL.hangBodyXf(ctx, st);
        REAL.drawTail(ctx, cat.name, Object.assign(REAL.hangTail(tt, st), { ph: lv.ph }), 1.6);
        REAL.hangLimbs(ctx, cat.name, tt, sd, st, "hind");
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(body, 0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
        REAL.hangLimbs(ctx, cat.name, tt, sd, st, "front");
        ctx.restore();
        if (head) { ctx.imageSmoothingEnabled = false; ctx.drawImage(head, 0, 0, w, h); ctx.imageSmoothingEnabled = true; }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const fc = cat.hangFrontCtx;
        if (head && fc && ctx === cat.hangCtx) {
          /* 嘴裡那一小片用「被咬的那則泡泡」本身的顏色（只查一次） */
          const a = cat.act;
          if (a && a.el && a.bubCol == null) { try { const bc = getComputedStyle(a.el).backgroundColor; a.bubCol = bc && bc !== "rgba(0, 0, 0, 0)" && bc !== "transparent" ? bc : ""; } catch (_) { a.bubCol = ""; } }
          fc.setTransform(1, 0, 0, 1, 0, 0); fc.clearRect(0, 0, fc.canvas.width, fc.canvas.height);
          fc.drawImage(ctx.canvas, 0, 0); /* 整隻（身體、四肢、尾巴、頭）都在泡泡前面 */
          tf(fc); REAL.hangMouthCut(fc, bk, (a && a.bubCol) || ""); fc.setTransform(1, 0, 0, 1, 0, 0);
        }
        return;
      }
      const k = f.rot ? 1 : 1 + lv.breath;
      const grid = () => {
        ctx.setTransform(R, 0, 0, R, 0, 0);
        if (f.rot) { ctx.translate(0, 32); ctx.rotate(-Math.PI / 2); }
      };
      const t = f.pose.tail;
      const tail = () => { grid(); REAL.drawTail(ctx, cat.name, Object.assign({}, t, { ph: lv.ph, x: t.x + (hipSway || 0) }), lv.sway); };
      if (t && !t.front) tail();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (hipSway) {
        grid();
        if (k !== 1) { ctx.translate(0, h * (1 - k)); ctx.scale(1, k); }
        const out = REAL.drawBody(ctx, cat.name, REAL.hipSwayPose(f.pose, hipSway), bk);
        if (lv.blink > 0 && out.open && out.eyes && !bk) REAL.blinkLids(ctx, out.eyes, lv.blink);
      } else {
        ctx.imageSmoothingEnabled = false;
        if (k !== 1) ctx.drawImage(body, 0, cv.height * (1 - k), cv.width, cv.height * k);
        else ctx.drawImage(body, 0, 0, cv.width, cv.height);
        ctx.imageSmoothingEnabled = true;
        if (lv.blink > 0 && body.open && body.eyes && !bk) {
          grid();
          if (k !== 1) { ctx.translate(0, h * (1 - k)); ctx.scale(1, k); }
          REAL.blinkLids(ctx, body.eyes, lv.blink);
        }
      }
      if (f.anim === "claw") {
        const ca = cat.act && cat.act.type === "claw" && cat.act.paws;
        grid(); REAL.clawArms(ctx, cat.name, f.pose, ca || [{ x: 3.8, y: 11.0 }, { x: 3.8, y: 11.0 }]);
      }
      if (t && t.front) tail();
      if (cat.pregnant && !cat.kit && cat.name === "gray" && f.anim && (f.anim === "sit" || f.anim === "walk" || f.anim === "run" || f.anim === "lick1")) {
        ctx.save();
        ctx.setTransform(R, 0, 0, R, 0, 0);
        const bob = Math.sin((now || 0) / 260) * 0.15;
        ctx.fillStyle = "#ece8e2";
        ctx.beginPath();
        ctx.ellipse(15.2, 15.6 + bob, 3.7, 2.9, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 0.35;
        ctx.strokeStyle = "#6d7076";
        ctx.stroke();
        ctx.fillStyle = "#e7b7c3";
        ctx.beginPath();
        ctx.ellipse(15.2, 16.3 + bob, 0.55, 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    function bonkStage(cat, now) {
      if (!(now < cat.bonkUntil)) return 0;
      return now - cat.bonkT0 < 260 ? 2 : 1;
    }
    function headOf(cat) {
      const ks = catS(cat);
      if (cat._hangOn && cat.act && cat.act.type === "hang" && cat.act.hl != null) {
        const hx = cat.dir < 0 ? HANG_W - REAL.HF.hx : REAL.HF.hx;
        return { x: cat.act.hl + hx * ks, y: cat.act.ht + REAL.HF.hy * ks, r: 5.5 * ks, top: cat.act.ht };
      }
      const f = cat.cur;
      if (!f) return null;
      const hx = cat.dir < 0 ? W - (f.cx + 0.5) : f.cx + 0.5;
      const top = floorY - cat.y - (H - f.top) * ks;
      return { x: cat.x + hx * ks, y: top + 4.5 * ks, r: 6.5 * ks, top };
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
      if (cat.act && (cat.act.type === "funny" || cat.act.type === "poop")) return false;
      cat.bonkCd = now + BONK_CD;
      cat.bonkT0 = now;
      cat.bonkUntil = now + rand(650, 850);
      hideBubble(cat, now);
      cat.nextBubble = Math.max(cat.nextBubble || 0, cat.bonkUntil + 300);
      const a = cat.act;
      const faceOnly = !a || a.type === "hang" || a.type === "bite" || a.type === "love" || a.type === "lie" || a.type === "rear" || a.type === "jump" || a.type === "carry" || a.type === "funny" || a.type === "poop" || (soc && (soc.kind === "love" || soc.kind === "climb")) || a.tapped || cat.pendingTap || cat.y >= 0.5;
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
    const SWEAT_SVG = '<svg viewBox="0 0 10 14" aria-hidden="true"><path d="M5 .8C6.6 4 9 6.4 9 9.2A4 4 0 0 1 1 9.2C1 6.4 3.4 4 5 .8z" fill="#7cc7ff"/><ellipse cx="3.6" cy="9" rx="1" ry="1.6" fill="#e9f7ff"/></svg>';
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
      const changed = f !== cat.cur || cat.dir !== cat.curDir || bk !== cat._bk;
      const liveMs = (f.anim === "rear" && f.fi >= 2 && soc && soc.kind === "climb" && (soc.phase === "hold" || soc.demoPhase === "hold")) ? (1000 / 60) : LIVE_MS;
      if (changed || now - cat.paintT > liveMs) {         if (!cat._hangOn) paintCat(cat.ctx, f, bk, W, H, cat, now); }
      if (changed) {
        cat._bk = bk;
        cat.cv.style.transform = cat.dir < 0 ? "scaleX(-1)" : "";
        cat.cur = f;
        cat.curDir = cat.dir;
        /* 泡泡放在頭上，並保持在聊天室內 */
        const ks = catS(cat);
        const ax = cat.dir < 0 ? (W - 1 - f.cx) : f.cx;
        cat.bubble.style.bottom = ((H - f.top) * ks + 8) + "px";
        cat._ax = (ax + 0.5) * ks;
      }
      const x = Math.round(cat.x);
      const bx = clamp(cat._ax, 20 - x, areaW - 20 - x);
      cat.bubble.style.left = bx + "px";
      {
        const ks = catS(cat);
        const headX = x + (cat._ax || W * ks / 2);
        const headBottom = cat.y + ((H - f.top) * ks + 8);
        const half = Math.max(18, (cat.say.offsetWidth || 0) / 2);
        const margin = 6;
        let shift = 0;
        if (headX - half < margin) shift = margin + half - headX;
        else if (headX + half > areaW - margin) shift = (areaW - margin) - (headX + half);
        const maxShift = Math.max(0, half - 10);
        shift = clamp(shift, -maxShift, maxShift);
        cat.say.style.left = headX + "px";
        cat.say.style.bottom = headBottom + "px";
        cat.say.style.setProperty("--talk-x", "calc(-50% + " + shift + "px)");
        cat.say.style.setProperty("--talk-origin", "calc(50% - " + shift + "px)");
        cat.say.style.setProperty("--talk-tail", "calc(50% - " + shift + "px)");
        cat.say.style.visibility = cat.hidden ? "hidden" : "";
      }
      const waddle = (cat.pregnant && !cat.kit && cat.name === "gray" && cat.act && (cat.act.type === "walk" || cat.act.type === "run"))
        ? " rotate(" + (Math.sin(now / 150) * 8).toFixed(1) + "deg)" : "";
      cat.el.style.transform = "translate3d(" + x + "px,0,0)" + waddle;
      if (waddle) cat.el.style.transformOrigin = "50% 100%";
      if (renderHang(cat)) return;
      cat.body.style.transform = "translate3d(" + (cat.act.type === "funny" ? (cat.jx || 0).toFixed(1) : "0") + "px," + (-Math.round(cat.y)) + "px,0)";
      const lift = clamp(cat.y / 60, 0, 1);
      cat.shadow.style.transform = "scale(" + (1 - lift * 0.45) + ")";
      cat.shadow.style.opacity = String(1 - lift * 0.5);
      const ks = catS(cat);
      if (cat.act.type === "sleep" || cat.act.type === "lie") cat.shadow.style.left = (cat.dir < 0 ? 6 : 8) * ks + "px";
      else cat.shadow.style.left = 7 * ks + "px";
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
    frontWrap = document.createElement("div");
    frontWrap.className = "cat-front";
    frontWrap.setAttribute("aria-hidden", "true");
    const frontCv = document.createElement("canvas");
    frontCv.width = Math.round(W * RES); frontCv.height = Math.round(H * RES);
    frontWrap.appendChild(frontCv);
    chat.insertBefore(frontWrap, inputBar);
    const frontCtx = frontCv.getContext("2d");
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
      if (a.tapped || a.type === "jump" || a.type === "stun" || a.type === "bite" || a.type === "hang" || a.type === "claw" || a.type === "poop" || a.type === "funny" || a.watch) return false;
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
        const dx = (x - j.bx) / Math.max(17, j.w * 0.16); /* 咬住的地方拉成比較尖，看得出被咬進嘴裡 */
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
    /* 房間裡任何人把泡泡軟掉：這台也讓黑貓跑去爬灰貓。
       已經在爬就不要重來。灰貓若還沒趴下，startClimb 會先讓牠趴好。趣味特效關掉就不播。 */
    window.addEventListener("sc-droop-climb", () => {
      if (petsOn === false) return;
      if (soc && soc.kind === "climb") return;
      const n = performance.now();
      if (soc) endSoc(n);
      for (const c of cats) {
        try { stopBite(c, n); } catch (_) {}
        c.y = 0;
      }
      startClimb(n);
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
      if (frontCv.width !== c.cv.width || frontCv.height !== c.cv.height) { frontCv.width = c.cv.width; frontCv.height = c.cv.height; }
      const Rc = c.cv.width / W;
      frontCtx.clearRect(0, 0, frontCv.width, frontCv.height);
      frontCtx.drawImage(c.cv, HEAD_COL * Rc, 0, (W - HEAD_COL) * Rc, c.cv.height, HEAD_COL * Rc, 0, (W - HEAD_COL) * Rc, c.cv.height);
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
    const J1M = SPRITES.gray.jump[1].mouth;
    const HANG_D0 = 13, HANG_DMAX = 19; /* 吊著時泡泡被往下拉多少（px） */
    function hangLen(f, k) { return (HANG_H - f.pt.y) * S * (k || 1); }
    function hangMinH(cat) { return Math.max(...SPRITES.gray.hang.map((f) => hangLen(f, catK(cat)))) + HANG_DMAX + 3; }
    function hangMaxH() { return 155; }
    function ensureHangCv(cat) {
      if (cat.hangCv) return;
      const cv = document.createElement("canvas");
      const hk = catK(cat);
      cv.className = "cat-hang"; cv.width = Math.round(HANG_W * RES * hk); cv.height = Math.round(HANG_H * RES * hk);
      cat.el.appendChild(cv);
      const fc = document.createElement("canvas");
      fc.width = cv.width; fc.height = cv.height;
      frontWrap.appendChild(fc);
      cat.hangCv = cv; cat.hangCtx = cv.getContext("2d");
      cat.hangFront = fc; cat.hangFrontCtx = fc.getContext("2d");
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
        if (hgt < hangMinH(cat) || hgt > hangMaxH() || s.w < 46) return;
        const m = Math.max(20, s.w * 0.18);
        const lo = s.x + m, hi = s.x + s.w - m;
        if (hi < lo) return;
        /* 下面那幾則泡泡：吊著的身體（約 24 格長、左右各 7 格）不要剛好被它們蓋住，
           找一個下面空著的位置咬；真的找不到就挑擋得最少的 */
        const bot = s.y + s.h, L = 24 * S, hw = 7 * S;
        const blk = shapes.filter((q) => q.el !== s.el && q.y > bot - 2 && q.y < bot + L && q.y + q.h > bot).map((q) => [q.x - hw, q.x + q.w + hw, q.y - bot]);
        const clearAt = (x) => { let c = L; for (const b of blk) if (x > b[0] && x < b[1]) c = Math.min(c, b[2]); return c; };
        const opts = [];
        for (const dir of [1, -1]) {
          const off = (dir > 0 ? J1M.x : W - J1M.x) * S;
          const a = Math.max(lo, minX() + off), b = Math.min(hi, maxX() + off);
          if (b < a) continue;
          const cand = [clamp(s.cx, a, b), a, b];
          for (const q of blk) for (const e of [q[0], q[1]]) if (e >= a && e <= b) cand.push(e);
          let best = null;
          for (const x of cand) { const c = clearAt(x), sc = c * 4 - Math.abs(x - s.cx) * 0.5; if (!best || sc > best.sc) best = { x, c, sc }; }
          opts.push({ dir, mx: best.x, standX: best.x - off, clear: best.c });
        }
        if (!opts.length) return;
        /* 優先：下面比較空的；再來順著走過去的方向（不用轉身） */
        opts.sort((p, q) => (q.clear - p.clear) || (((q.standX - cat.x) * q.dir > 0) - ((p.standX - cat.x) * p.dir > 0)));
        const o = opts[0];
        out.push({ el: s.el, rank, dir: o.dir, mx: o.mx, standX: o.standX, relX: o.mx - s.x, kind: "hang", clear: o.clear });
      });
      out.sort((p, q) => ((q.clear >= 18 * S) - (p.clear >= 18 * S)) || (Math.abs(p.standX - cat.x) - Math.abs(q.standX - cat.x)));
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
        cat.y = Math.max(0, floorY - (a.mouth.y + hangLen(f, catK(cat))));
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
        if (floorY - (a.mouth.y + hangLen(f, catK(cat))) < 1) { hangDrop(cat, a, now); } /* 泡泡往下移到腳碰地：放開 */
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
        cat.hangCv.classList.toggle("front-all", on);
        cat.hangKey = null;
      }
      if (!on) return false;
      const f = SPRITES[cat.name].hang[a.fi];
      const bk = bonkStage(cat, performance.now()); /* ⚠️ 這裡沒有 now 參數：以前寫 now 會丟 ReferenceError，整個貓迴圈停掉 */
      const key = a.fi + ":" + cat.dir + ":" + bk;
      const nowH = performance.now();
      if (cat.hangKey !== key || nowH - (cat.hangPaintT || 0) > LIVE_MS) {
        cat.hangKey = key; cat.hangPaintT = nowH;
        paintCat(cat.hangCtx, f, bk, HANG_W, HANG_H, cat, nowH);
        /* 舊的側面吊姿才把嘴巴那幾列另外貼到前面；仰頭吊姿由 paintCat 畫到前面那張畫布 */
        if (!f.hangF) {
          const hc = cat.hangCv;
          cat.hangFrontCtx.clearRect(0, 0, hc.width, hc.height);
          cat.hangFrontCtx.drawImage(hc, 0, 0); /* 整隻都畫在泡泡前面 */
        }
      }
      const ks = catS(cat);
      const ptx = cat.dir < 0 ? HANG_W - f.pt.x : f.pt.x;
      const left = Math.round(a.mouth.x - ptx * ks), top = Math.round(a.mouth.y - f.pt.y * ks);
      a.hl = left; a.ht = top;
      const x = Math.round(cat.x);
      const w = HANG_W * ks + "px", h = HANG_H * ks + "px";
      for (const cv of [cat.hangCv, cat.hangFront]) {
        cv.style.width = w; cv.style.height = h;
        const dx = cv === cat.hangCv ? left - x : left;
        cv.style.transform = "translate3d(" + dx + "px," + (top - (floorY - HANG_H * ks)) + "px,0)" + (cat.dir < 0 ? " scaleX(-1)" : "");
      }
      /* 地上的影子：在吊著的貓正下方，離地越高越淡越小 */
      const lift = clamp((floorY - (top + HANG_H * ks)) / 60, 0, 1);
      cat.shadow.style.left = (left + HANG_W * ks / 2 - 9 * ks - x) + "px";
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
    function paintTailHeart() {
      const w = Math.round(LOVE_TAIL_W * RES), h = Math.round(LOVE_TAIL_H * RES);
      if (tailCv.width === w && tailCv.height === h && tailCv._done) return;
      tailCv.width = w; tailCv.height = h; tailCv._done = true;
      const tc = tailCv.getContext("2d");
      tc.setTransform(w / LOVE_TAIL_W, 0, 0, h / LOVE_TAIL_H, 0, 0);
      tc.clearRect(0, 0, LOVE_TAIL_W, LOVE_TAIL_H);
      REAL.drawTailHeart(tc);
    }
    paintTailHeart();
    resHooks.push(paintTailHeart);
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
      const ks = catS(cat);
      return { x: cat.x + (ax + 0.5) * ks, y: floorY - cat.y - (H - f.top) * ks };
    }
    /* 黑貓走到趴著的灰貓旁邊，後腳踩在屁股旁的地板上，把肚子靠在背上抱抱（後腳不離地） */
    function climbHoldX(g, face) {
      const C = REAL.CLIMB;
      const sg = S, sb = S * BROWN_K;
      /* 黑貓比較大：胸口仍對準灰貓的背。臉朝右時原點在左邊，翻面時原點算法要跟著鏡像。 */
      if (face > 0) return g.x + C.backX * sg - C.chestX * sb;
      return g.x + (W - C.backX) * sg - (W - C.chestX) * sb;
    }
    function climbPlantX(g, face) {
      const sh = REAL.CLIMB.plantShift * S * BROWN_K;
      return climbHoldX(g, face) + (face > 0 ? -sh : sh);
    }
    function climbOrangeX(g, face, u) { return lerpC(climbPlantX(g, face), climbHoldX(g, face), u); }
    function pickClimbSpot() {
      const g = cats.find((c) => c.name === "gray");
      const tryFace = (gx, face) => {
        const fake = { x: gx };
        const hx = climbHoldX(fake, face), px = climbPlantX(fake, face);
        if (gx < minX() - 0.5 || gx > maxX() + 0.5) return null;
        if (Math.min(hx, px) < minX() - 0.5 || Math.max(hx, px) > maxX() + 0.5) return null;
        return { gx, face, hx, px };
      };
      const order = (g.x - minX() >= maxX() - g.x) ? [1, -1] : [-1, 1];
      for (const face of order) { const s = tryFace(g.x, face); if (s) return s; }
      const need = (REAL.CLIMB.plantShift + Math.abs(REAL.CLIMB.chestX - REAL.CLIMB.backX)) * S;
      for (const face of order) {
        const gx = face > 0 ? clamp(g.x, minX() + need, maxX()) : clamp(g.x, minX(), maxX() - need);
        const s = tryFace(gx, face); if (s) return s;
      }
      return { gx: clamp((minX() + maxX()) / 2 + 6 * S, minX(), maxX()), face: 1 };
    }
    function startClimb(now) {
      const g = cats.find((c) => c.name === "gray"), b = other(g);
      if (!g || !b) return false;
      if (window.PetMenu && window.PetMenu.isOpen) return false;
      if (g.hidden || b.hidden || g.y > 0.5 || b.y > 0.5) return false;
      if (ball.state === "carried") { ball.state = "loose"; ball.carrier = null; }
      for (const c of [g, b]) { c.ballUntil = 0; c.y = 0; }
      const spot = pickClimbSpot();
      soc = { kind: "climb", a: g, b, g, br: b, t0: now, phase: "approach", ready: new Set(), face: spot.face, gx: spot.gx };
      const bx = climbPlantX({ x: spot.gx }, spot.face);
      g.el.style.zIndex = "1"; b.el.style.zIndex = "3";
      for (const [c, tx] of [[g, spot.gx], [b, bx]]) {
        if (Math.abs(c.x - tx) < 2.5) {
          c.x = tx; c.dir = spot.face;
          setAct(c, c === g ? { type: "lie", fi: 0, dur: 1e9, face: spot.face, keepDir: true } : { type: "sit", dur: 1e9, face: spot.face }, now);
          soc.ready.add(c); /* setAct 會先把 ready 清掉，要加回來 */
        } else setAct(c, moveAct("walk", tx, rand(46, 58)), now);
      }
      return true;
    }
    function climbHoldNow(s, now, o) {
      o = o || {};
      const g = s.g, b = s.br, face = s.face;
      g.x = s.gx; b.x = climbHoldX(g, face);
      g.dir = b.dir = face;
      g.el.style.zIndex = "1"; b.el.style.zIndex = "3";
      setAct(g, { type: "lie", fi: o.glance ? 1 : 0, dur: 1e9, face, keepDir: true }, now);
      setAct(b, { type: "rear", fi: o.fi != null ? o.fi : 2, dur: 1e9, face, keepDir: true }, now);
      s.phase = "hold"; s.tHold = now; s.until = now + (o.hold || rand(3400, 4800));
      s.glanceAt = o.glance ? now : now + rand(700, 1200);
    }
    function climbStep(now) {
      const s = soc, g = s.g, b = s.br, face = s.face;
      if (s.phase === "demo") return;
      if (s.phase === "approach") {
        if (g.act && g.act.type !== "lie" && (s.ready.has(g) || Math.abs(g.x - s.gx) < 2.5)) {
          setAct(g, { type: "lie", fi: 0, dur: 1e9, face, keepDir: true }, now);
          soc.ready.add(g);
        }
        if (s.ready.has(b) && b.act && b.act.type === "sit") { b.dir = face; }
        if (bothReady()) {
          g.x = s.gx; b.x = climbPlantX(g, face);
          g.dir = b.dir = face;
          g.el.style.zIndex = "1"; b.el.style.zIndex = "3";
          setAct(g, { type: "lie", fi: 0, dur: 1e9, face, keepDir: true }, now);
          setAct(b, { type: "rear", fi: 0, dur: 1e9, face, keepDir: true }, now);
          s.phase = "rise"; s.tRise = now;
          say(g, "zzz", now, 0.55);
        }
        return;
      }
      if (s.phase === "rise") {
        const u = clamp((now - s.tRise) / 520, 0, 1);
        b.x = climbOrangeX(g, face, u);
        b.dir = face; g.dir = face;
        b.act.fi = u < 0.42 ? 0 : u < 0.82 ? 1 : 2;
        if (u >= 1) {
          b.x = climbHoldX(g, face);
          b.act.fi = 2;
          s.phase = "hold"; s.tHold = now; s.until = now + rand(3400, 4800);
          s.glanceAt = now + rand(700, 1200);
          say(b, pick(["heart", "sparkle"]), now, 0.75);
        }
        return;
      }
      if (s.phase === "hold") {
        b.x = climbHoldX(g, face);
        b.dir = face; g.dir = face;
        const kn = Math.floor((now - s.tHold) / 420) % 6;
        b.act.fi = [2, 3, 2, 4, 2, 5][kn];
        b.act.hipSway = REAL.CLIMB.hipAmp * Math.sin(2 * Math.PI * REAL.CLIMB.hipHz * ((now - s.tHold) / 1000));
        if (now >= (s.glanceAt || 1e15)) {
          const fl = Math.floor((now - s.glanceAt) / 520) % 4;
          g.act.fi = fl === 0 || fl === 1 ? 1 : fl === 2 ? 3 : 2;
        } else g.act.fi = 0;
        if (now > s.until) { s.phase = "drop"; s.tDrop = now; g.act.fi = 0; b.act.fi = 1; }
        return;
      }
      if (s.phase === "drop") {
        const e = now - s.tDrop;
        const u = 1 - clamp(e / 400, 0, 1);
        b.x = climbOrangeX(g, face, u);
        b.act.fi = u > 0.5 ? 1 : 0;
        if (e >= 400) {
          b.x = climbPlantX(g, face);
          setAct(b, { type: "sit", dur: rand(800, 1400), face }, now);
          setAct(g, { type: "lie", fi: 0, dur: rand(1800, 3200), face, keepDir: true }, now);
          endSoc(now);
        }
      }
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
      if (c.hangCv) { c.hangCv.style.display = "none"; c.hangCv.classList.remove("front-all"); }
      if (c.hangFront) c.hangFront.style.display = "none";
      if (c.body) c.body.style.visibility = "";
      c.hangKey = null; c.cur = null;
      if (!Number.isFinite(c.x)) c.x = (minX() + maxX()) / 2;
      c.x = clamp(c.x, minX(), maxX());
      if (c.dir !== 1 && c.dir !== -1) c.dir = 1;
      if (ball.carrier === c) { ball.state = "loose"; ball.carrier = null; }
      c.jx = 0;
      c.act = { type: "sit", t0: now, dur: rand(1500, 2600) };
    }
    /* 跳／吊的最長時間：超過就當作卡住，直接安全落地坐下 */
    const JUMP_MAX_MS = 2500, HANG_MAX_MS = 16000, BITE_MAX_MS = 12000, CLAW_MAX_MS = 6500, FUNNY_MAX_MS = 21000, POOP_MAX_MS = 9000, PET_MAX_MS = 9000;
    /* 球雨砸到：兩隻中斷手上的事，各擺一個搞笑姿勢僵住。球淡出後再僵 5 秒，最長 20 秒 */
    function rainFreeze(c, now, dur) {
      try { for (const j of jellies.slice()) if (j.cat === c || (c.act && j.act === c.act)) resetJelly(j); } catch (_) {}
      try { if (soc && inSoc(c)) endSoc(now); } catch (_) { soc = null; }
      c.queue = []; c.pendingTap = false; c.y = 0; c._hangOn = false; c.stillMs = 0; c.ballUntil = 0;
      if (c.hangCv) { c.hangCv.style.display = "none"; c.hangCv.classList.remove("front-all"); }
      if (c.hangFront) c.hangFront.style.display = "none";
      if (c.body) c.body.style.visibility = "";
      c.hangKey = null; c.cur = null;
      if (ball.carrier === c) { ball.state = "loose"; ball.carrier = null; ball.vx = rand(-90, 90); ball.vy = -rand(150, 260); }
      c.x = clamp(Number.isFinite(c.x) ? c.x : (minX() + maxX()) / 2, minX(), maxX());
      const k = c.name === "gray" ? 1 : 0;
      c.act = { type: "funny", t0: now, dur: clamp(dur, 800, 20000), k };
      showBubble(c, now, k ? "bang" : "dots");
      c.bubbleUntil = now + c.act.dur;
    }
    function funnyStep(cat, a, now) {
      const e = now - a.t0;
      if (e >= a.dur) { cat.jx = 0; cat.y = 0; finish(cat, now); return; }
      if (a.k === 1 && e < 420) { const p = e / 420; cat.y = 4 * 24 * p * (1 - p); } else cat.y = 0;
      cat.jx = e < 420 && a.k === 1 ? 0 : (Math.floor(e / 45) % 2 ? 0.7 : -0.7) * (e > a.dur - 600 ? 0.3 : 1);
    }
    window.addEventListener("sc-rain", (ev) => {
      if (petsOn === false) return;
      const n = performance.now(), ms = (ev.detail && ev.detail.ms) || 5000;
      if (ev.detail && ev.detail.phase === "gone") {
        for (const c of cats) {
          const a = c.act;
          if (!a || a.type !== "funny") continue;
          a.dur = clamp(n - a.t0 + ms, 800, 20000);
          c.bubbleUntil = a.t0 + a.dur;
        }
        return;
      }
      try { if (window.PetMenu) window.PetMenu.close("force"); } catch (_) {}
      try { if (soc) endSoc(n); } catch (_) { soc = null; }
      for (const c of cats) { try { if (!c.hidden) rainFreeze(c, n, ms); } catch (err) { petSafeReset(c, n, err); } }
      nextBiteAt = Math.max(nextBiteAt, n + ms + rand(4000, 8000));
      nextSocialAt = Math.max(nextSocialAt, n + ms + rand(3000, 6000));
      try { const rain = window.BallRain; if (rain && rain.setHoles) requestAnimationFrame(() => rain.setHoles(cats.filter((c) => c.act && c.act.type === "funny" && c.body).map((c) => c.body.getBoundingClientRect()), ms)); } catch (_) {}
    });
    const HANG_PHASE_MAX = { crouch: 1200, rise: 1500, fall: 2500, land: 2000, sit: 4000 };
    function petWatchdog(c, now) {
      const a = c.act;
      if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) { petSafeReset(c, now, new Error("cat position NaN")); return; }
      if (!a) { petSafeReset(c, now); return; }
      if (a.type === "jump" && now - a.t0 > JUMP_MAX_MS) { petSafeReset(c, now, new Error("jump watchdog")); return; }
      if (a.type === "bite" && now - a.t0 > BITE_MAX_MS) { petSafeReset(c, now, new Error("bite watchdog")); return; }
      if (a.type === "claw" && now - a.t0 > CLAW_MAX_MS) { petSafeReset(c, now, new Error("claw watchdog")); return; }
      if (a.type === "funny" && now - a.t0 > FUNNY_MAX_MS) { c.jx = 0; petSafeReset(c, now); return; }
      if (a.type === "poop" && now - a.t0 > POOP_MAX_MS) { petSafeReset(c, now, new Error("poop watchdog")); return; }
      if (a.type === "pet" && now - a.t0 > PET_MAX_MS) { petSafeReset(c, now, new Error("pet watchdog")); return; }
      if (a.menu && (!window.PetMenu || window.PetMenu.forId !== c.name) && now - a.t0 > 400) { c.queue = []; finish(c, now); return; }
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
    roosterApi = attachRooster({
      layer, scrollEl, msgList, cats,
      S: () => S, floorY: () => floorY, areaW: () => areaW, chatR: () => chatR,
      everDrooped, enabled: () => petsOn !== false,
    });
    boboApi = attachBobo({
      layer, scrollEl,
      S: () => S, floorY: () => floorY, areaW: () => areaW, chatR: () => chatR,
      enabled: () => petsOn !== false,
    });
    quokkaApi = attachQuokka({
      layer, scrollEl,
      S: () => S, floorY: () => floorY, areaW: () => areaW, chatR: () => chatR,
      enabled: () => petsOn !== false,
    });
    window.__quokka = quokkaApi;
    /* 房間分組：cats、quokka（Bobo 與 QUOKKA 同一組）、rooster。
       總開關 sc-pets 關掉時這台裝置全部不顯示，分組狀態仍留在房間裡。
       現場切換才跑進跑出；晚進房或總開關重新打開只對齊目前狀態。 */
    let groups = { cats: true, quokka: true, rooster: true };
    let phase = { cats: "shown", quokka: "shown", rooster: "shown" };
    function motionOk() {
      try { return !window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (_) { return true; }
    }
    function quietCats(now) {
      try { if (soc) endSoc(now); } catch (_) {}
      try { for (const j of jellies.slice()) resetJelly(j); } catch (_) {}
      for (const c of cats) {
        try {
          if (c.act && c.act.type === "bite") abortBite(c, now);
          else if (c.act && c.act.type === "hang") stopBite(c, now);
        } catch (_) {}
        c.queue = []; c.y = 0; c._hangOn = false; c.jx = 0;
        if (c.hangFront) c.hangFront.style.display = "none";
        if (c.hangCv) c.hangCv.style.display = "none";
        try { if (c.talking) hideTalk(c, now); } catch (_) {}
        try { hideBubble(c, now); } catch (_) {}
        try { start(c, { type: "sit", dur: rand(1500, 2600) }, now); } catch (_) {}
        c.el.hidden = true;
      }
      if (ball.carrier) {
        try { dropBall(ball.carrier, now); }
        catch (_) { ball.state = "loose"; ball.carrier = null; }
      }
      try { clearPetFx(); } catch (_) {}
      try { if (frontCv) frontCv.style.display = "none"; } catch (_) {}
      try { if (fightEl) fightEl.style.display = "none"; } catch (_) {}
      layer.classList.add("cats-off");
      sayLayer.classList.add("cats-off");
      for (const k of kits) k.el.hidden = true;
    }
    function showCats() {
      for (const c of cats) { c.el.hidden = false; c.hidden = false; c.el.style.visibility = ""; }
      layer.classList.remove("cats-off");
      sayLayer.classList.remove("cats-off");
    }
    function catWidth(c) { return W * catS(c); }
    function startCatLeave(now) {
      quietCats(now);
      showCats();
      for (const c of cats) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        c.exitDir = dir;
        const tx = dir > 0 ? areaW + catWidth(c) + 16 : -catWidth(c) - 16;
        start(c, { type: "run", tx, speed: 260, exit: true, dur: 1e9 }, now);
      }
    }
    function startCatEnter(now) {
      showCats();
      for (const c of cats) {
        const back = -(c.exitDir || (Math.random() < 0.5 ? -1 : 1));
        const w = catWidth(c);
        c.x = back > 0 ? -w - 12 : areaW + 12;
        c.y = 0;
        c.queue = [];
        const tx = c.name === "gray" ? Math.max(12, areaW * 0.16) : Math.max(12, areaW * 0.58);
        start(c, { type: "run", tx, speed: 240, enter: true, dur: 1e9 }, now);
      }
    }
    function settleFloor(key, on) {
      const apis = key === "quokka" ? [boboApi, quokkaApi] : [roosterApi];
      for (const api of apis) if (api && api.settle) api.settle(on);
    }
    function startFloorLeave(key) {
      const dir = () => Math.random() < 0.5 ? -1 : 1;
      if (key === "quokka") {
        if (boboApi) boboApi.march("out", dir());
        if (quokkaApi) quokkaApi.march("out", dir());
      } else if (roosterApi) roosterApi.march("out", dir());
    }
    function startFloorEnter(key) {
      const back = (api, field) => {
        const prev = api && api[field] && api[field].exitDir;
        return -(prev || (Math.random() < 0.5 ? -1 : 1));
      };
      if (key === "quokka") {
        if (boboApi) boboApi.march("in", back(boboApi, "bobo"));
        if (quokkaApi) quokkaApi.march("in", back(quokkaApi, "q"));
      } else if (roosterApi) roosterApi.march("in", back(roosterApi, "rooster"));
    }
    function snapGroup(key, now) {
      const on = groups[key] !== false;
      phase[key] = on ? "shown" : "gone";
      if (key === "cats") { if (on) showCats(); else quietCats(now); }
      else settleFloor(key, on);
    }
    let pregnant = false;
    let wantKits = false;
    let kitPhase = "gone";
    function hideKits() {
      kitPhase = "gone";
      for (const k of kits) k.el.hidden = true;
    }
    function startKitLeave(now) {
      kitPhase = "leaving";
      for (const k of kits) {
        k.el.hidden = false;
        const dir = Math.random() < 0.5 ? -1 : 1;
        k.exitDir = dir;
        const w = W * catS(k);
        const tx = dir > 0 ? areaW + w + 12 : -w - 12;
        start(k, { type: "run", tx, speed: 180, exit: true, dur: 1e9 }, now);
      }
    }
    function startKitEnter(now) {
      kitPhase = "entering";
      for (const k of kits) {
        k.el.hidden = false;
        const back = -(k.exitDir || (k.i ? 1 : -1));
        const w = W * catS(k);
        k.x = back > 0 ? -w - 8 : areaW + 8;
        k.y = 0;
        k.queue = [];
        const tx = Math.max(8, areaW * (k.i ? 0.62 : 0.38));
        start(k, { type: "run", tx, speed: 160, enter: true, dur: 1e9 }, now);
      }
    }
    function kitThink(k, now) {
      const mom = cats.find((c) => c.name === "gray") || cats[0];
      const home = mom.x + (k.i ? 1 : -1) * W * S * 0.72;
      const tx = clamp(home, 4, Math.max(4, areaW - W * catS(k) - 4));
      const a = k.act;
      if (a && a.type === "jump") return;
      if (Math.abs(tx - k.x) > 16) {
        if (!a || a.type !== "walk") start(k, { type: "walk", tx, speed: 34, dur: 1e9 }, now);
        else a.tx = tx;
      } else if (a && a.type === "walk") {
        start(k, { type: "sit", dur: rand(500, 1200) }, now);
      } else if (a && a.type === "sit" && now - a.t0 > a.dur && Math.random() < 0.4) {
        start(k, { type: "jump", x1: clamp(k.x + (Math.random() < 0.5 ? -18 : 18), 4, areaW - 8), h: 14, air: 340 }, now);
      }
    }
    function syncKits(on, animate, now) {
      wantKits = !!on;
      const allow = groups.cats !== false && petsOn !== false;
      if (wantKits && allow) {
        if (!animate || kitPhase === "shown") {
          kitPhase = "shown";
          for (const k of kits) k.el.hidden = false;
        } else startKitEnter(now);
        return;
      }
      if (animate && allow && kitPhase === "shown") { startKitLeave(now); return; }
      hideKits();
    }
    function applyGroups(next, animate, now) {
      const live = !!animate && petsOn !== false && motionOk();
      for (const key of ["cats", "quokka", "rooster"]) {
        const on = next[key] !== false;
        const was = groups[key] !== false;
        groups[key] = on;
        if (!live || was === on) { if (!live) snapGroup(key, now); continue; }
        phase[key] = on ? "entering" : "leaving";
        if (key === "cats") { if (on) startCatEnter(now); else startCatLeave(now); }
        else if (on) startFloorEnter(key);
        else startFloorLeave(key);
      }
      const preg = !!next.catPregnant;
      if (preg !== pregnant) {
        pregnant = preg;
        const g = cats.find((c) => c.name === "gray");
        if (g) { g.pregnant = preg; g.cur = null; }
      }
      syncKits(!!next.kittens, live, now);
    }
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
      const floorStep = (key, apis) => {
        if (phase[key] === "leaving" || phase[key] === "entering") {
          for (const api of apis) if (api) api.step(now);
          if (apis.every((api) => !api || api.marchDone())) {
            phase[key] = groups[key] ? "shown" : "gone";
            if (!groups[key]) for (const api of apis) if (api) api.hide();
          }
        } else if (groups[key]) {
          for (const api of apis) if (api) api.step(now);
        } else {
          for (const api of apis) if (api) api.hide();
        }
      };
      floorStep("rooster", [roosterApi]);
      floorStep("quokka", [boboApi, quokkaApi]);
      const shapes = bubbleShapes();
      const catsOn = phase.cats === "shown" || phase.cats === "entering";
      if (phase.cats === "shown" && !soc && now > nextSocialAt) {
        if (canJoin(cats[0], now) && canJoin(cats[1], now)) startSocial(now);
        else nextSocialAt = now + 400;
      }
      ballPhysics(dt, now, shapes);
      if (catsOn) {
      for (const c of cats) {
        if (!inSoc(c) && !(c.act && (c.act.type === "funny" || c.act.type === "poop" || c.act.enter))) ballThink(c, now, false);
        /* 保險：同一個動作卡太久就換下一個（僵住和便便有自己的看門狗） */
        const a = c.act;
        if (a && !inSoc(c) && a.type !== "sleep" && a.type !== "funny" && a.type !== "poop" && !a.tapped && now - a.t0 > 22000) { c.queue = []; finish(c, now); }
      }
      for (const c of cats) {
        try { petWatchdog(c, now); update(c, now, dt); }
        catch (err) { petSafeReset(c, now, err); }
      }
      socStep(now);
      /* 兩隻重疊時，隨機決定誰在前面 */
      const ov = Math.abs(cats[0].x - cats[1].x) < W * S * 0.7;
      if (ov && !overlapped && !(soc && soc.kind === "climb")) { const f = Math.random() < 0.5 ? 0 : 1; cats[f].el.style.zIndex = "3"; cats[1 - f].el.style.zIndex = "1"; }
      overlapped = ov;
      for (const c of cats) {
        try { render(c, now); renderBonkFx(c, now); }
        catch (err) { petSafeReset(c, now, err); }
      }
      jellyStep(now, dt);
      try { clawMarksStep(now); } catch (_) { clearClawMarks(); }
      try { poopPilesStep(now); } catch (_) { clearPoops(); }
      try { petFxStep(now); } catch (_) { clearPetFx(); }
      renderFront();
      if (!cats.some((c) => c.act && c.act.enter)) biteSchedule(now);
      if (phase.cats === "entering" && cats.every((c) => !(c.act && c.act.enter))) phase.cats = "shown";
      } else if (phase.cats === "leaving") {
        for (const c of cats) {
          try { update(c, now, dt); render(c, now); }
          catch (err) { petSafeReset(c, now, err); }
        }
        if (cats.every((c) => c.act && c.act.exit && c.act.done)) {
          quietCats(now);
          phase.cats = "gone";
        }
      }
      if (groups.cats !== false && (wantKits || kitPhase === "leaving" || kitPhase === "entering")) {
        for (const k of kits) {
          try {
            if (kitPhase === "shown") kitThink(k, now);
            update(k, now, dt);
            render(k, now);
          } catch (err) { k.el.hidden = true; }
        }
        if (kitPhase === "leaving" && kits.every((k) => k.act && k.act.exit && k.act.done)) hideKits();
        if (kitPhase === "entering" && kits.every((k) => !(k.act && k.act.enter))) kitPhase = "shown";
      } else if (kitPhase !== "leaving") {
        for (const k of kits) k.el.hidden = true;
      }
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
    /* 閒置時先把常用姿勢畫好存起來，動作開始時就不用臨時畫 */
    function warmRealCache() {
      const jobs = [];
      for (const c of cats) for (const anim of Object.keys(SPRITES[c.name])) SPRITES[c.name][anim].forEach((f) => {
        jobs.push([c.name, f, 0]);
        if (anim === "sit" || anim === "love" || anim === "walk" || anim === "hang") jobs.push([c.name, f, 1], [c.name, f, 2]);
      });
      const res0 = RES;
      const idle = window.requestIdleCallback || ((fn) => setTimeout(() => fn({ timeRemaining: () => 8 }), 60));
      const step = (dl) => {
        if (RES !== res0 || petsOn === false) return;
        let n = 0;
        while (jobs.length && (n === 0 || dl.timeRemaining() > 4) && n < 4) {
          const [name, f, bk] = jobs.shift();
          try { if (f.rot || f.hangF) { realBody(name, f, bk, HANG_W, HANG_H); if (f.headF) realBody(name, f.headF, bk, HANG_W, HANG_H); } else realBody(name, f, bk, W, H); } catch (_) {}
          n++;
        }
        if (jobs.length) idle(step);
      };
      idle(step);
    }
    setTimeout(warmRealCache, 800);
    resHooks.push(() => setTimeout(warmRealCache, 800));
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
        c.queue = []; c.y = 0; c._hangOn = false; c.jx = 0;
        if (c.hangFront) c.hangFront.style.display = "none";
        if (c.act && (c.act.type === "funny" || c.act.type === "poop" || c.act.type === "pet" || c.act.menu)) {
          try { hideBubble(c, n); } catch (_) {}
          try { start(c, { type: "sit", dur: rand(1500, 2600) }, n); } catch (_) {}
        }
      }
      for (const j of jellies.slice()) resetJelly(j);
      if (ball.state === "carried" || ball.state === "drag") { ball.state = "loose"; ball.carrier = null; ball.dragId = null; }
      ball.vx = 0; ball.vy = 0;
      petsOn = false;
      clearClawMarks(); /* 貓關掉：爪痕一起清掉，也不再留新的 */
      clearPoops();
      try { clearPetFx(); } catch (_) {}
      try { if (window.PetMenu) window.PetMenu.close("force"); } catch (_) {}
      for (const el of msgList.querySelectorAll("canvas.bub-shade, canvas.bub-warp")) el.remove();
      for (const el of msgList.querySelectorAll(".bub.jelly")) el.classList.remove("jelly");
      layer.style.display = "none";
      frontWrap.style.display = "none";
      sayLayer.style.display = "none";
      for (const c of cats) { try { if (c.talking) hideTalk(c, n); } catch (_) {} }
      if (roosterApi) roosterApi.hide();
      if (boboApi) boboApi.hide();
      if (quokkaApi) quokkaApi.hide();
      if (warpLayer) warpLayer.style.display = "none";
      chat.style.removeProperty("--cat-walk");
      chat.classList.add("pets-off");
    }
    function petsEnable() {
      if (petsOn !== false) return;
      petsOn = true;
      layer.style.display = "";
      frontWrap.style.display = "";
      sayLayer.style.display = "";
      if (warpLayer) warpLayer.style.display = "";
      chat.classList.remove("pets-off");
      const n = performance.now();
      last = n;
      nextSocialAt = Math.max(nextSocialAt, n + rand(6000, 12000));
      nextBiteAt = Math.max(nextBiteAt, n + rand(6000, 12000));
      for (const c of cats) c.nextClawAt = Math.max(c.nextClawAt || 0, n + rand(10000, 25000));
      for (const c of cats) c.nextPoopAt = Math.max(c.nextPoopAt || 0, n + rand(POOP_FIRST[0], POOP_FIRST[1]));
      applyGroups({ cats: groups.cats, quokka: groups.quokka, rooster: groups.rooster, catPregnant: pregnant, kittens: wantKits }, false, n);
      wake();
    }
    window.addEventListener("sc-pets", (e) => { if (e.detail && e.detail.on) petsEnable(); else petsDisable(); });
    const takeGroups = (d) => applyGroups({
      cats: !d || d.cats !== false,
      quokka: !d || d.quokka !== false,
      rooster: !d || d.rooster !== false,
      catPregnant: !!(d && d.catPregnant),
      kittens: !!(d && d.kittens),
    }, !!(d && d.animate), performance.now());
    window.addEventListener("sc-pet-groups", (e) => takeGroups(e.detail || {}));
    try { if (localStorage.getItem("sc-pets") === "off") petsOn = false; } catch (_) {}
    if (window.__petGroupState) takeGroups({ ...window.__petGroupState, animate: false });
    if (petsOn === false) petsDisable(); else wake();
    /* 測試用：window.__cats 可以直接觸發互動 */
    window.__cats = { cats, kits, ball, get enabled() { return petsOn !== false; }, setEnabled: (on) => { if (on) petsEnable(); else petsDisable(); }, bonk: (i) => { const c = cats[i || 0]; c.bonkCd = 0; return bonk(c, performance.now()); }, get S() { return S; }, get floorY() { return floorY; },
      talk: (name, force) => { const c = typeof name === "number" ? cats[name] : cats.find((x) => x.name === name); return showTalk(c, performance.now(), force !== false); },
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
      /* 磨爪：claw(i, { x, dur }) 讓第 i 隻立刻在 x 磨爪；clawInfo(i)；marks 目前畫面上的爪痕組數 */
      claw: (i, o) => { o = o || {}; const n = performance.now(), c = cats[i || 0]; if (soc) endSoc(n); stopBite(c, n); c.ballUntil = 0; if (ball.carrier === c) dropBall(c, n); if (o.x != null) c.x = clamp(o.x, minX(), maxX()); c.y = 0; c.queue = []; setAct(c, { type: "claw", dur: o.dur || rand(2600, 3600) }, n); return true; },
      clawInfo: (i) => { const c = cats[i || 0], a = c.act; return { act: a && a.type, paws: a && a.paws, next: c.nextClawAt - performance.now() }; },
      get marks() { return clawMarks.map((g) => ({ left: g.el.style.left, bottom: g.el.style.bottom, h: g.h, lines: g.lines.length, reach: g.reach, passes: g.passes, op: g.el.style.opacity, age: performance.now() - g.t0 })); },
      setNextClaw: (i, ms) => { cats[i || 0].nextClawAt = performance.now() + ms; },
      get stillMs() { return cats.map((c) => c.stillMs); },
      get jelly() { return jellies.map((j) => ({ text: j.el.textContent, held: j.held, ox: j.ox, oy: j.oy, stretch: j.ox * j.side / j.w })); },
      get nextBiteAt() { return nextBiteAt; }, set nextBiteAt(v) { nextBiteAt = v; },
      /* 談戀愛：love() 立刻開始；soc.phase 看目前階段（notice/approach/nuzzle/lick/scoot/tail） */
      love: () => { const n = performance.now(); endSoc(n); for (const c of cats) { c.ballUntil = 0; if (c.hidden) return false; } if (ball.state === "carried") { ball.state = "loose"; ball.carrier = null; } startLove(n); return true; },
      /* 黑貓把前腳搭上灰貓的背：climb() 完整演一次；climb({ now: true }) 直接停在搭住的姿勢；climb({ now: true, glance: true, fi: 3 }) 可指定灰貓回頭、黑貓踩奶影格 */
      climb: (o) => {
        o = o || {};
        const n = performance.now();
        endSoc(n);
        for (const c of cats) { c.ballUntil = 0; c.y = 0; if (c.hidden) return false; }
        if (ball.state === "drag") return false;
        if (ball.state === "carried") { ball.state = "loose"; ball.carrier = null; }
        try { if (window.PetMenu && window.PetMenu.isOpen) window.PetMenu.close("force"); } catch (_) {}
        if (!startClimb(n)) return false;
        if (o.now) climbHoldNow(soc, n, o);
        return true;
      },
      climbInfo: () => { const s = soc; if (!s || s.kind !== "climb") return null; return { phase: s.phase, face: s.face, gx: s.gx, fi: s.br && s.br.act && s.br.act.fi, gfi: s.g && s.g.act && s.g.act.fi }; },
      /* 預覽／錄影用：依秒數 t 對齊完整動作（不靠真實時間，避免截圖時 requestAnimationFrame 不穩） */
      climbAt: (t) => {
        const n = performance.now();
        if (ball.state === "carried" || ball.state === "drag") { ball.state = "loose"; ball.carrier = null; }
        try { if (window.PetMenu && window.PetMenu.isOpen) window.PetMenu.close("force"); } catch (_) {}
        const g = cats.find((c) => c.name === "gray"), b = other(g);
        if (!g || !b || g.hidden || b.hidden) return false;
        for (const c of [g, b]) { c.ballUntil = 0; c.y = 0; c.queue = []; }
        if (!soc || soc.kind !== "climb" || !soc.demo) {
          if (soc) endSoc(n);
          const spot = pickClimbSpot();
          soc = { kind: "climb", a: g, b, g, br: b, t0: n, phase: "demo", ready: new Set(), face: spot.face, gx: spot.gx, demo: true };
        }
        const s = soc, face = s.face;
        const xHold = climbHoldX({ x: s.gx }, face);
        const xPlant = climbPlantX({ x: s.gx }, face);
        const xStart = clamp(xPlant - face * Math.min(90, Math.abs(xPlant - (face > 0 ? minX() : maxX())) * 0.9), minX(), maxX());
        const T = { walk0: 0.30, walk1: 1.65, rise1: 2.20, hold1: 6.15, drop1: 6.60, end: 8.0 };
        let phase, u, bx, fi = 0, gfi = 0, btype = "walk";
        if (t < T.walk0) { phase = "start"; bx = xStart; btype = "sit"; }
        else if (t < T.walk1) { phase = "walk"; u = (t - T.walk0) / (T.walk1 - T.walk0); bx = lerpC(xStart, xPlant, u); btype = "walk"; }
        else if (t < T.rise1) { phase = "rise"; u = (t - T.walk1) / (T.rise1 - T.walk1); bx = climbOrangeX({ x: s.gx }, face, u); fi = u < 0.42 ? 0 : u < 0.82 ? 1 : 2; btype = "rear"; }
        else if (t < T.hold1) {
          phase = "hold"; bx = xHold; btype = "rear";
          const kn = Math.floor((t - T.rise1) / 0.42) % 6;
          fi = [2, 3, 2, 4, 2, 5][kn];
          if (t >= T.rise1 + 0.7) { const fl = Math.floor((t - T.rise1 - 0.7) / 0.52) % 4; gfi = fl === 0 || fl === 1 ? 1 : fl === 2 ? 3 : 2; }
        } else if (t < T.drop1) { phase = "drop"; u = 1 - (t - T.hold1) / (T.drop1 - T.hold1); bx = climbOrangeX({ x: s.gx }, face, u); fi = u > 0.5 ? 1 : 0; btype = "rear"; }
        else { phase = "done"; bx = xPlant; btype = "sit"; }
        const hipSway = phase === "hold" ? REAL.CLIMB.hipAmp * Math.sin(2 * Math.PI * REAL.CLIMB.hipHz * (t - T.rise1)) : 0;
        g.x = s.gx; g.dir = face; b.x = bx; b.dir = t < T.walk0 ? face : (btype === "walk" && Math.abs(xPlant - b.x) > 1 ? (xPlant > b.x ? 1 : -1) : face);
        g.el.style.zIndex = "1"; b.el.style.zIndex = "3";
        g.act = { type: "lie", t0: n, dur: 1e9, fi: gfi, face, keepDir: true };
        b.act = { type: btype, t0: n - (btype === "walk" ? t * 1000 : 0), dur: 1e9, fi, tx: xPlant, speed: 50, face, keepDir: true, hipSway };
        s.phase = "demo"; s.demoPhase = phase;
        for (const c of [g, b]) { c.paintT = 0; render(c, n); }
        return { phase, t, hipSway };
      } };
}
