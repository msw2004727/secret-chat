/* 聊天室裡的兩隻貓與螢光球。只在這台瀏覽器裡跑，不上傳、不跟別人同步。 */
export function mountRoomPets() {
    "use strict";
    const DATA = {"W":32,"H":20,"pal":{"gray":{"k":"#010101","b":"#a79e99","d":"#6f645e","p":"#efaea1","w":"#fefdfb","t":"#e27880","f":"#807873"},"brown":{"k":"#010101","b":"#cd804e","d":"#c86b2b","p":"#ebcebf","w":"#fcfefc","t":"#e27880","f":"#ac6230"}},"frames":{"gray":{"sit":["///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbwbbbwbbdk/....kkkbbbkbkbkbbbkkk/......kdbbbbbbbbbdk/....kkkbbbbbbbbbbbkkk/.......kkbbbbbbbkk....kkk/.........kbbbbbk.....kdddk/.........kppbbddk...kdbdbk/.........kpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kddkbbkbbkk/..........kkkkkkkk"],"walk":["///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kddk.........kbbbbbbbbbwbbkk..k/kbbk.........kbbbbbbbbbkbbbtkk/kddkkkkkkkkkkkbbbbbbbbbbbbbk/.kbbbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbppppppbbbbbk/...kbbkkffkkkkkbbkffk/...kbbkkffk...kbbkffk/...kbbkkffk...kbbkffk/....kk..kk.....kk.kk","////................k.....k/...............kbk...kbk/...kk.........kbpbkkkbpbk/..kbbk........kbppbbbppbbk/.kddk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbpppppppbbbbk/....kbbffkkkkkkkbbfk/....kbbffk.....kbbfk/....kbbkk.......kffk/.....kk..........kk","///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kddk.........kbbbbbbbbbwbbkk..k/kbbk.........kbbbbbbbbbkbbbtkk/kddkkkkkkkkkkkbbbbbbbbbbbbbk/.kbbbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbbpppppppbbbk/...kffkkbbkkkkkffkbbk/...kffkkbbk...kffkbbk/...kffkkbbk...kffkbbk/....kk..kk.....kk.kk","////................k.....k/...............kbk...kbk/...kk.........kbpbkkkbpbk/..kbbk........kbppbbbppbbk/.kddk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbppppppppbbbk/....kffbbkkkkkkkfbbk/....kffbbk.....kfbbk/....kffkk.......kbbk/.....kk..........kk"],"run":["///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kkbbkffkkffkbbkk/......kbbkffkkffkbbk/......kbbkffkkffkbbk/.......kbbkffffkbbk/........kk.kkkk.kk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbdbbdbbdbbbbbbbbbbbbkk.kk/..kkbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbbbkkk/...kbbbbbppppppppppbbbk/..kffbbkkkkkkkkkkkkbbffk/..kfbbk............kbbfk/.kfbbk..............kbbfk/.kbbk................kbbk/..kk..................kk","///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kfbbkkkkkkkbbfkk/.....kfbbk.....kbbfk/.....kfbbk.....kbbfk/....kfbbk.......kbbfk/.....kkk.........kkk","////................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kkkkbbfffbbkkkkk/........kbbfffbbk/.......kbbffffkbbk/........kkkkkk.kk"],"jump":["//////................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbffbpppppppffbbk/...kbbffkkkkkkkkffbbk/....kkkk........kkkk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/.............kbbbbbbbbbkbbbtkk/....kkkkkkkkkkbbbbbbbbbbbbbk/...kbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/.kddbbbbbbbbbbbbbbbbkbbkk/kbbkbbbbbbbbbbbbbbbbbbk/ddkkbbbbbppppppppbbbkk/kkkffbbkkkkkkkkkkkkk/.kffbbk/kffbbk/.kkkk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/...kk........kbbbdbdbbbbbbk/..kbbk.......kbbbbbbbbbwbbkk..k/.kbbk........kbbbbbbbbbkbbbtkk/.kddkkkkkkkkkkbbbbbbbbbbbbbk/..kbbbbdbbdbbdbbbbbbbbbbbkk.kk/...kbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbkkkkk/....kbbbbbbbbbbbbbbbk/....kbbbfbpppppfbbbbk/.....kbbfkkkkkkfbbkk/......kbbk....kbbk/.......kk......kk"],"sleep":["///////////...............kkk.....kkk/......kkkkkkkkkpbbkkkkkbbpk/.....kbbdbbdbbkppbdbdbdbppk/....kbbbdbbdbbkbbbdbbbdbbbk/....kbbbbbbbbbkbbbbbbbbbbbk/...kkbbbbbbbbbkdbbbbbbbbbdk/..kdbbbbbbbbkkkbbkkbkbkkbbkkk/..kbdbbbdbbbdbkdbbbbbbbbbdk/...kkkkkkkkkkkkbbbbbbbbbbbkkk","//////////...............kkk.....kkk/......kkkkkkkkkpbbkkkkkbbpk/.....kbbdbbdbbkppbdbdbdbppk/....kbbbdbbdbbkbbbdbbbdbbbk/....kbbbbbbbbbkbbbbbbbbbbbk/....kbbbbbbbbbkdbbbbbbbbbdk/...kkbbbbbbbkkkbbkkbkbkkbbkkk/..kdbbbbbbbbbbkdbbbbbbbbbdk/..kbdbbbdbbbkkkbbbbbbbbbbbkkk/...kkkkkkkkk...kkkkkkkkkkk"],"scratch":["/...........kkk.....kkk/..........kpbbkkkkkbbpk/..........kppbdbdbdbppk/..........kbbbdbbbdbbbk/..........kbbbbbbbbbbbk/..........kdbbwbbbwbbdk...kk/........kkkbbbkbkbkbbbkkkkbbk/..........kdbbbbbbbbbdkkbbbbk/........kkkbbbbbbbbbbbbbbbkk/...........kbbbbbbbbbbbbkk/...........kbbppppbbbbkkkkkk/...........kbbppppbbffffffffk/...........kbbppppbbffffffffk/.......kk..kbbppppbbkkkkkkkk/......kddk.kbbppppbbk/.......kbbkbbbbbbbbbk/........kddbkffkkbbk/.........kkkkffkkbbk/.............kk..kk","/...........kkk.....kkk/..........kpbbkkkkkbbpk/..........kppbdbdbdbppk/..........kbbbdbbbdbbbk/..........kbbbbbbbbbbbk...kk/..........kdbbwbbbwbbdk.kkffk/........kkkbbbkbkbkbbbkkffffk/..........kdbbbbbbbbbdffffkk/........kkkbbbbbbbbbffffkkkk/...........kbbbbbbbbffkkbbbbk/...........kbbppppbbbbbbbbbbk/...........kbbppppbbbbbbkkkk/...........kbbppppbbkkkk/.......kk..kbbppppbbk/......kddk.kbbppppbbk/.......kbbkbbbbbbbbbk/........kddbkffkkbbk/.........kkkkffkkbbk/.............kk..kk"],"lick1":["///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdkkkkbbbbbdk/....kkkbkppkkbkkbbkkk/......kdkbbktbbbbdk/....kkkbkbbkbbbbbbkkk/.......kkbbkbbbbkk....kkk/........kbbkbbbk.....kdddk/........kbbkbbddk...kdbdbk/........kdbkpbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kddkbbkbbkk/..........kkkkkkkk","///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbkkkkkbkkbbkkk/......kdkppkbbbbbdk/....kkkbkbbkbbbbbbkkk/.......kkbbkbbbbkk....kkk/........kbbkbbbk.....kdddk/........kbbkbbddk...kdbdbk/........kdbkpbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kddkbbkbbkk/..........kkkkkkkk"],"lick2":["/////.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbbkkbkbkkbbkkk/......kdbbbbtbbbbdk...kkk/....kkkbbbbbbbbbbbkkkkdddk/.......kkkppbbddkk..kdbdbk/.........kpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kddkbbkbbkk/..........kkkkkkkk","//////.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbbkkbkbkkbbkkk.kkk/......kdbbbbtbbbbdk..kdddk/....kkkbbbbbbbbbbbkkkdbdbk/.......kkkpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kddkbbkbbkk/..........kkkkkkkk"],"lick3":["//......kkk/.....kpppk/.....kpppk/.....kbbbk.kkk.....kkk/.....kbbbkkpbbkkkkkbbpk/.....kbbbkkppbdbdbdbppk/.....kbbbkkbbbdbbbdbbbk/.....kbbbkkbbbbbbbbbbbk/.....kbbbkkdbbbbbbbbbdk/.....kbbkkkbbkkbkbkkbbkkk/.....kbbbkkdbbbbtbbbbdk/.....kbbkkkbbbbbbbbbbbkkk/.....kbbbbbbbbbbbbbbbbbk...kk/......kkbbbbbbbbbbbbbbbk.kkddk/.......kbbbbbbbbbbbbbbbkkdbbk/.......kbbbbbbbbbbbbbbbbbbkk/.......kbbpppppppppppbbkkk/........kkkkkkkkkkkkkkk","//......kkk/.....kpppk/.....kpppk/.....kbbbk/.....kbbbk.kkk.....kkk/.....kbbbkkpbbkkkkkbbpk/.....kbbbkkppbdbdbdbppk/.....kbbbkkbbbdbbbdbbbk/.....kbbbkkbbbbbbbbbbbk/.....kbbbkkdbbbbbbbbbdk/.....kbbkkkbbkkbkbkkbbkkk/.....kbbbbkdbbbbbbbbbdk/.....kbbkkkbbbbbbbbbbbkkk..kk/......kkbbbbbbbbbbbbbbbk.kkddk/.......kbbbbbbbbbbbbbbbkkdbbk/.......kbbbbbbbbbbbbbbbbbbkk/.......kbbpppppppppppbbkkk/........kkkkkkkkkkkkkkk"]},"brown":{"sit":["///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbwbbbwbbdk/....kkkbbbkbkbkbbbkkk/......kdbbbbbbbbbdk/....kkkbbbbbbbbbbbkkk/.......kkbbbbbbbkk....kkk/.........kbbbbbk.....kdddk/.........kppbbddk...kdbdbk/.........kpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kbbkbbkbbkk/..........kkkkkkkk"],"walk":["///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kddk.........kbbbbbbbbbwbbkk..k/kbbk.........kbbbbbbbbbkbbbtkk/kddkkkkkkkkkkkbbbbbbbbbbbbbk/.kbbbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbppppppbbbbbk/...kbbkkffkkkkkbbkffk/...kbbkkffk...kbbkffk/...kbbkkffk...kbbkffk/....kk..kk.....kk.kk","////................k.....k/...............kbk...kbk/...kk.........kbpbkkkbpbk/..kbbk........kbppbbbppbbk/.kddk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbpppppppbbbbk/....kbbffkkkkkkkbbfk/....kbbffk.....kbbfk/....kbbkk.......kffk/.....kk..........kk","///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kddk.........kbbbbbbbbbwbbkk..k/kbbk.........kbbbbbbbbbkbbbtkk/kddkkkkkkkkkkkbbbbbbbbbbbbbk/.kbbbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbbbbbbbbbbbbk/...kbbbbbbpppppppbbbk/...kffkkbbkkkkkffkbbk/...kffkkbbk...kffkbbk/...kffkkbbk...kffkbbk/....kk..kk.....kk.kk","////................k.....k/...............kbk...kbk/...kk.........kbpbkkkbpbk/..kbbk........kbppbbbppbbk/.kddk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbbbbppppppppbbbk/....kffbbkkkkkkkfbbk/....kffbbk.....kfbbk/....kffkk.......kbbk/.....kk..........kk"],"run":["///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kkbbkffkkffkbbkk/......kbbkffkkffkbbk/......kbbkffkkffkbbk/.......kbbkffffkbbk/........kk.kkkk.kk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbdbbdbbdbbbbbbbbbbbbkk.kk/..kkbbdbbdbbdbbdbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbbbkkk/...kbbbbbppppppppppbbbk/..kffbbkkkkkkkkkkkkbbffk/..kfbbk............kbbfk/.kfbbk..............kbbfk/.kbbk................kbbk/..kk..................kk","///................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kfbbkkkkkkkbbfkk/.....kfbbk.....kbbfk/.....kfbbk.....kbbfk/....kfbbk.......kbbfk/.....kkk.........kkk","////................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/kkk..........kbbbbbbbbbkbbbtkk/bbdkkkkkkkkkkkbbbbbbbbbbbbbk/kkbbdbbdbbdbbdbbbbbbbbbbbkk.kk/..kkbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbbkkkk/....kbbbbbppppppppbbbk/.....kkkkbbfffbbkkkkk/........kbbfffbbk/.......kbbffffkbbk/........kkkkkk.kk"],"jump":["//////................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..kk..........kbppbbbppbbk/.kbbk........kbbbdbdbbbbbbk/kbbk.........kbbbbbbbbbwbbkk..k/kddkkkkkkkkkkkbbbbbbbbbkbbbtkk/.kbbbbdbbdbbdbbbbbbbbbbbbbbk/..kbbbdbbdbbdbbbbbbbbbbbbkk.kk/...kbbbbbbbbbbbbbbbbbbbbbk....k/...kbbbbbbbbbbbbbbbbkkkkk/...kbbffbpppppppffbbk/...kbbffkkkkkkkkffbbk/....kkkk........kkkk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/.............kbbbdbdbbbbbbk/.............kbbbbbbbbbwbbkk..k/.............kbbbbbbbbbkbbbtkk/....kkkkkkkkkkbbbbbbbbbbbbbk/...kbbdbbdbbdbbbbbbbbbbbbkk.kk/..kbbbdbbdbbdbbdbbbbbbbbbk....k/.kddbbbbbbbbbbbbbbbbkbbkk/kbbkbbbbbbbbbbbbbbbbbbk/ddkkbbbbbppppppppbbbkk/kkkffbbkkkkkkkkkkkkk/.kffbbk/kffbbk/.kkkk","//................k.....k/...............kbk...kbk/..............kbpbkkkbpbk/..............kbppbbbppbbk/...kk........kbbbdbdbbbbbbk/..kbbk.......kbbbbbbbbbwbbkk..k/.kbbk........kbbbbbbbbbkbbbtkk/.kddkkkkkkkkkkbbbbbbbbbbbbbk/..kbbbbdbbdbbdbbbbbbbbbbbkk.kk/...kbbbdbbdbbdbbbbbbbbbbbk....k/....kbbbbbbbbbbbbbbbkkkkk/....kbbbbbbbbbbbbbbbk/....kbbbfbpppppfbbbbk/.....kbbfkkkkkkfbbkk/......kbbk....kbbk/.......kk......kk"],"sleep":["///////////...............kkk.....kkk/......kkkkkkkkkpbbkkkkkbbpk/.....kbbdbbdbbkppbdbdbdbppk/....kbbbdbbdbbkbbbdbbbdbbbk/....kbbbbbbbbbkbbbbbbbbbbbk/...kkbbbbbbbbbkdbbbbbbbbbdk/..kdbbbbbbbbkkkbbkkbkbkkbbkkk/..kbdbbbdbbbdbkdbbbbbbbbbdk/...kkkkkkkkkkkkbbbbbbbbbbbkkk","//////////...............kkk.....kkk/......kkkkkkkkkpbbkkkkkbbpk/.....kbbdbbdbbkppbdbdbdbppk/....kbbbdbbdbbkbbbdbbbdbbbk/....kbbbbbbbbbkbbbbbbbbbbbk/....kbbbbbbbbbkdbbbbbbbbbdk/...kkbbbbbbbkkkbbkkbkbkkbbkkk/..kdbbbbbbbbbbkdbbbbbbbbbdk/..kbdbbbdbbbkkkbbbbbbbbbbbkkk/...kkkkkkkkk...kkkkkkkkkkk"],"scratch":["/...........kkk.....kkk/..........kpbbkkkkkbbpk/..........kppbdbdbdbppk/..........kbbbdbbbdbbbk/..........kbbbbbbbbbbbk/..........kdbbwbbbwbbdk...kk/........kkkbbbkbkbkbbbkkkkbbk/..........kdbbbbbbbbbdkkbbbbk/........kkkbbbbbbbbbbbbbbbkk/...........kbbbbbbbbbbbbkk/...........kbbppppbbbbkkkkkk/...........kbbppppbbffffffffk/...........kbbppppbbffffffffk/.......kk..kbbppppbbkkkkkkkk/......kddk.kbbppppbbk/.......kbbkbbbbbbbbbk/........kddbkffkkbbk/.........kkkkffkkbbk/.............kk..kk","/...........kkk.....kkk/..........kpbbkkkkkbbpk/..........kppbdbdbdbppk/..........kbbbdbbbdbbbk/..........kbbbbbbbbbbbk...kk/..........kdbbwbbbwbbdk.kkffk/........kkkbbbkbkbkbbbkkffffk/..........kdbbbbbbbbbdffffkk/........kkkbbbbbbbbbffffkkkk/...........kbbbbbbbbffkkbbbbk/...........kbbppppbbbbbbbbbbk/...........kbbppppbbbbbbkkkk/...........kbbppppbbkkkk/.......kk..kbbppppbbk/......kddk.kbbppppbbk/.......kbbkbbbbbbbbbk/........kddbkffkkbbk/.........kkkkffkkbbk/.............kk..kk"],"lick1":["///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdkkkkbbbbbdk/....kkkbkppkkbkkbbkkk/......kdkbbktbbbbdk/....kkkbkbbkbbbbbbkkk/.......kkbbkbbbbkk....kkk/........kbbkbbbk.....kdddk/........kbbkbbddk...kdbdbk/........kdbkpbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kbbkbbkbbkk/..........kkkkkkkk","///.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbkkkkkbkkbbkkk/......kdkppkbbbbbdk/....kkkbkbbkbbbbbbkkk/.......kkbbkbbbbkk....kkk/........kbbkbbbk.....kdddk/........kbbkbbddk...kdbdbk/........kdbkpbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kbbkbbkbbkk/..........kkkkkkkk"],"lick2":["/////.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbbkkbkbkkbbkkk/......kdbbbbtbbbbdk...kkk/....kkkbbbbbbbbbbbkkkkdddk/.......kkkppbbddkk..kdbdbk/.........kpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kbbkbbkbbkk/..........kkkkkkkk","//////.......kkk.....kkk/......kpbbkkkkkbbpk/......kppbdbdbdbppk/......kbbbdbbbdbbbk/......kbbbbbbbbbbbk/......kdbbbbbbbbbdk/....kkkbbkkbkbkkbbkkk.kkk/......kdbbbbtbbbbdk..kdddk/....kkkbbbbbbbbbbbkkkdbdbk/.......kkkpppbbddk.kbdkkk/.........kppppbbddkbbk/.........kppppbbbbdbk/.........kbbkbbkbbkk/..........kkkkkkkk"],"lick3":["//......kkk/.....kpppk/.....kpppk/.....kbbbk.kkk.....kkk/.....kbbbkkpbbkkkkkbbpk/.....kbbbkkppbdbdbdbppk/.....kbbbkkbbbdbbbdbbbk/.....kbbbkkbbbbbbbbbbbk/.....kbbbkkdbbbbbbbbbdk/.....kbbkkkbbkkbkbkkbbkkk/.....kbbbkkdbbbbtbbbbdk/.....kbbkkkbbbbbbbbbbbkkk/.....kbbbbbbbbbbbbbbbbbk...kk/......kkbbbbbbbbbbbbbbbk.kkddk/.......kbbbbbbbbbbbbbbbkkdbbk/.......kbbbbbbbbbbbbbbbbbbkk/.......kbbpppppppppppbbkkk/........kkkkkkkkkkkkkkk","//......kkk/.....kpppk/.....kpppk/.....kbbbk/.....kbbbk.kkk.....kkk/.....kbbbkkpbbkkkkkbbpk/.....kbbbkkppbdbdbdbppk/.....kbbbkkbbbdbbbdbbbk/.....kbbbkkbbbbbbbbbbbk/.....kbbbkkdbbbbbbbbbdk/.....kbbkkkbbkkbkbkkbbkkk/.....kbbbbkdbbbbbbbbbdk/.....kbbkkkbbbbbbbbbbbkkk..kk/......kkbbbbbbbbbbbbbbbk.kkddk/.......kbbbbbbbbbbbbbbbkkdbbk/.......kbbbbbbbbbbbbbbbbbbkk/.......kbbpppppppppppbbkkk/........kkkkkkkkkkkkkkk"]}}};
    const W = DATA.W, H = DATA.H;
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
      const rows = str.split("/");
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
    const SPRITES = {};
    for (const name of Object.keys(DATA.frames)) {
      const pal = {};
      for (const k in DATA.pal[name]) pal[k] = hexRGB(DATA.pal[name][k]);
      SPRITES[name] = {};
      for (const anim of Object.keys(DATA.frames[name])) {
        SPRITES[name][anim] = DATA.frames[name][anim].map((s, i) => {
          const f = buildFrame(s === "=" ? DATA.frames.gray[anim][i] : s, pal);
          if (anim === "lick3") f.cx = 16; /* 抬腿舔毛時，泡泡對準頭不是腳 */
          f.side = anim === "walk" || anim === "run" || anim === "jump";
          if (!f.side || !f.mouth) f.mouth = { x: f.cx + 0.5, y: f.top + 7.5 };
          return f;
        });
      }
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
    const FIGHT_COOLDOWN = 25000;
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
      /* 跟畫面上的官方氣泡同一組圓角：一般是四角 18、尾巴那一側 6。讀計算後的值，不另外畫成圓或橢圓。 */
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
    /* 目前畫面上看得到的訊息泡泡（原本的圓角矩形） */
    function bubbleShapes() {
      const sr = scrollEl.getBoundingClientRect();
      const out = [];
      for (const b of msgList.querySelectorAll(".row:not(.shattering):not(.gone) .bub:not(.ghost)")) {
        const r = b.getBoundingClientRect();
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
        if (Math.abs(c.x + W * S / 2 - ball.x) < 110 && Math.random() < 0.3) { c.ballUntil = now + rand(5000, 11000); say(c, "bang", now, 0.6); }
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
    /* 叼著的球跟主人同一層：畫在主人頭上，但另一隻走到前面時會蓋住球。
       鬆開、拖曳、彈跳時球回到貓層外面，仍蓋在兩隻貓之上。 */
    function parkBall() {
      const host = ball.state === "carried" && ball.carrier ? ball.carrier.el : layer;
      if (ballEl.parentNode !== host) host.appendChild(ballEl);
    }
    function renderBall(now) {
      if (ball.state === "hidden") { ballEl.style.display = "none"; ballShadow.style.display = "none"; return; }
      ballEl.style.display = ""; ballShadow.style.display = "";
      const carrier = ball.state === "carried" ? ball.carrier : null;
      if (carrier) {
        const p = mouthPos(carrier);
        ball.x = p.x; ball.y = p.y; ball.vx = 0; ball.vy = 0;
      }
      parkBall();
      const sq = now - ball.squashAt < 90 ? "scale(1.18,0.82)" : "";
      let tx = ball.x - BR, ty = ball.y - floorY - BR;
      if (carrier && ballEl.parentNode === carrier.el) {
        tx -= carrier.x;
        ty += H * S;
      }
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
      /* 被訊息蓋住時不搶點擊，長按刪除照常。 */
      if (underBubble(cx, cy)) return false;
      return d < BR + 12;
    }
    function grabBall(e, now) {
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
      if (!fromFinish && a && (a.tapped || a.type === "jump" || cat.pendingTap)) return false;
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
      cat.carryUntil = now + rand(4500, 11000);
      cat.stealTries = 0;
      if (cat.act && cat.act.type !== "jump") setAct(cat, { type: "carry", speed: 50 }, now);
      say(cat, pick(["sparkle", "note", "heart"]), now, 0.7);
      /* 另一隻：多半會過來搶 */
      const o = other(cat);
      if (!o.hidden && !inSoc(o)) {
        const sleeping = o.act && o.act.type === "sleep";
        if (!wants(o, now) && Math.random() < (sleeping ? 0.35 : 0.75)) o.ballUntil = now + rand(7000, 15000);
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
      cat.ballUntil = Math.random() < 0.5 ? now + rand(4000, 10000) : 0;
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
      if ((ball.x - center) * dir < -W * S * 0.18) dir = -dir; /* 球在背後：先轉身 */
      const mx = dir > 0 ? 27.3 : W - 27.3;
      const target = clamp(ball.x - mx * S, minX(), maxX());
      const d = target - cat.x;
      if (dir !== cat.dir) { cat.dir = dir; a.still = true; return; }
      if (Math.abs(d) < 2 || Math.sign(d) !== dir) {
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
      const out = weighted({ fight: now - lastFightAt > 40000 ? 22 : 0, snatch: 42, escape: 36 });
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
        const r = c.cv.getBoundingClientRect();
        srcs.push({ kind: "cv", cv: c.cv, flip: c.dir < 0, x: r.left - chatR.left, y: r.top - chatR.top, w: r.width, h: r.height });
      }
      if (fightEl.style.display !== "none") {
        const r = fightCv.getBoundingClientRect();
        srcs.push({ kind: "cv", cv: fightCv, flip: false, x: r.left - chatR.left, y: r.top - chatR.top, w: r.width, h: r.height });
      }
      if (ball.state === "carried") srcs.push({ kind: "ball", x: ball.x - BR, y: ball.y - BR, w: BR * 2, h: BR * 2 });
      for (const s of shapes) {
        const hits = srcs.filter((o) => o.x < s.x + s.w && o.x + o.w > s.x && o.y < s.y + s.h && o.y + o.h > s.y);
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
      const t = weighted({ walk: 20, run: 8, jump: 10, sit: 10, lick1: 7, lick2: 7, lick3: 7, sleep: 6, scratch: 8, look: 6,
        ball: ball.state === "loose" ? 9 : 0 });
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
      const dur = t === "sleep" ? rand(5000, 9000) : t === "sit" ? rand(1500, 3500) : rand(2600, 4200);
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
    let nextSocialAt = now0 + rand(2500, 4500);
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
      if (!a || a.tapped || a.type === "jump" || c.pendingTap) return false;
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
      const k = weighted({ chase: 34, fight: fightOK(now) ? 5 : 0, follow: 18, cuddle: 20, faceoff: 14 });
      for (const c of cats) hideBubble(c, now);
      if (k === "chase") { const c = pick(cats); startChase(c, other(c), now); }
      else if (k === "fight") startFight(now);
      else if (k === "follow") startFollow(now);
      else if (k === "cuddle") startCuddle(now);
      else startFaceoff(now);
    }
    function endSoc(now) {
      const s = soc;
      if (!s) return;
      soc = null;
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
      nextSocialAt = now + rand(2000, 5000);
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

    function frameFor(cat, now) {
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
        case "sit": case "fight": return SPRITES[cat.name].sit[0];
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
      bubbleStep(cat, now);
    }
    function moveCat(cat, a, now, dt) {
      const e = Math.max(0, now - a.t0);
      cat.y = 0;
      if (a.type === "ballchase") { ballChaseStep(cat, a, now, dt); return; }
      if (a.type === "carry") { carryStep(cat, a, now, dt); return; }
      if (a.type === "steal") { stealStep(cat, a, now, dt); return; }
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
        a.still = Math.abs(d) < 3 && !(o.act && o.act.type === "walk");
        if (Math.abs(d) >= 3) { cat.dir = d > 0 ? 1 : -1; cat.x += Math.sign(d) * step; }
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
        if (cat.hidden) chance = 0;
        if (Math.random() < chance) showBubble(cat, now, t === "chase" || t === "flee" ? pick(PLAY_ICONS) : (soc && inSoc(cat) && t !== "sleep" ? pick(["heart", "note", "sparkle"]) : null));
        else cat.nextBubble = now + rand(2500, 7000);
      }
    }

    function render(cat, now) {
      const f = frameFor(cat, now) || SPRITES[cat.name].sit[0];
      if (f !== cat.cur || cat.dir !== cat.curDir) {
        cat.ctx.clearRect(0, 0, W, H);
        cat.ctx.drawImage(f.cv, 0, 0);
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
      cat.body.style.transform = "translate3d(0," + (-Math.round(cat.y)) + "px,0)";
      const lift = clamp(cat.y / 60, 0, 1);
      cat.shadow.style.transform = "scale(" + (1 - lift * 0.45) + ")";
      cat.shadow.style.opacity = String(1 - lift * 0.5);
      if (cat.act.type === "sleep") cat.shadow.style.left = (cat.dir < 0 ? 6 : 8) * S + "px";
      else cat.shadow.style.left = 7 * S + "px";
    }

    let last = performance.now();
    let overlapped = false;
    let rafId = 0;
    function loop(now) {
      if (!chatLive() || document.hidden) {
        rafId = 0;
        document.documentElement.classList.remove("room-pet-drag");
        if (ball.state === "drag") { ball.state = "loose"; ball.dragId = null; }
        return;
      }
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
      for (const c of cats) update(c, now, dt);
      socStep(now);
      /* 兩隻重疊時，隨機決定誰在前面 */
      const ov = Math.abs(cats[0].x - cats[1].x) < W * S * 0.7;
      if (ov && !overlapped) { const f = Math.random() < 0.5 ? 0 : 1; cats[f].el.style.zIndex = "2"; cats[1 - f].el.style.zIndex = "1"; }
      overlapped = ov;
      for (const c of cats) render(c, now);
      renderBall(now);
      drawShade(now, dt, shapes);
      rafId = requestAnimationFrame(loop);
    }
    function wake() {
      if (rafId || !chatLive() || document.hidden) return;
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
    wake();
    /* 測試用：window.__cats 可以直接觸發互動 */
    window.__cats = { cats, ball, get S() { return S; }, get floorY() { return floorY; },
      throwBall: (x, y, vx, vy) => { ball.state = "loose"; ball.carrier = null; ball.x = x; ball.y = y; ball.vx = vx; ball.vy = vy; onThrow(performance.now()); },
      give: (i) => { endSoc(performance.now()); catchBall(cats[i], performance.now()); },
      ballFight: () => { const n = performance.now(); endSoc(n); if (ball.state !== "carried") catchBall(cats[0], n); const c = ball.carrier; startBallFight(other(c), c, n); },
      calm: (ms) => { const n = performance.now(); endSoc(n); for (const c of cats) { c.ballUntil = 0; c.stealCd = 0; } if (ball.state !== "drag") { ball.state = "loose"; ball.carrier = null; } nextSocialAt = n + (ms || 8000); },
      place: (i, x, act) => { const c = cats[i]; c.x = x; c.queue = []; start(c, act || { type: "sit", dur: 1e9 }, performance.now()); },
      get soc() { return soc; }, startFight: () => { endSoc(performance.now()); startFight(performance.now()); }, startChase: () => { endSoc(performance.now()); startChase(cats[0], cats[1], performance.now()); }, tap: (i) => tapSit(cats[i], performance.now()) };
}
