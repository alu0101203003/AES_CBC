
// --------------- Funciones principales ----------------- \\

function generar (){
  
  var datos = get_datos();
  clave = datos.clave;
  texto = datos.texto;
  vinit = datos.vinit;

  var salida = cbc(clave,vinit,texto)
  imprimirSalida(salida)
}

// --------------------------------------------------------- \\

function get_datos (){

    clave = document.getElementById("clave").value;
    vinit = document.getElementById("vinit").value;
    texto = document.getElementById("texto").value;

    var clave_array = clave.split(" ").join("").match(/.{1,2}/g);
    var vinit_array = vinit.split(" ").join("").match(/.{1,2}/g);  
    var texto_array = texto.split(" ").join("").match(/.{1,2}/g);
        
	var datos = {  // vector de datos en hexadecimal ["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f"]
		clave: clave_array,
		texto: texto_array,
    vinit: vinit_array
	};
	return datos;
}

// --------------- Funciones modo cbc ----------------- \\

function cbc (key,vinit,texto){
  var bloques_cifrados = []
  var bloques = dividir_bloque(texto)
  var texto_sz = texto.length;
  var bloques_sz = bloques.length * 16;

  console.log(texto)
  console.log(bloques)
  
  //la longitud del mensaje es múltiplo de la longitud del bloque
  if (texto_sz == bloques_sz){
    bloques_cifrados = cbc_completo(key,vinit,bloques)
  } else { //la longitud del mensaje no es múltiplo de la longitud del bloque
    bloques_cifrados = cbc_robado(key,vinit,bloques,texto)
  }
  return bloques_cifrados
    
}

function cbc_completo(key,vinit,bloques){
  var resultado = []
  var encadenado = vinit

  for (var i = 0; i < bloques.length; i++){
    var texto_xor = AddRoundKey(encadenado,bloques[i])
    var cifrado = rinjdael(key, texto_xor).cifrado
    cifrado = cifrado.match(/.{1,2}/g)
    resultado.push(cifrado)
    encadenado = cifrado
  }

  return resultado
}

function cbc_robado(key,vinit,bloques,texto){
  var resultado = []
  var primera_parte = cbc_completo(key,vinit,bloques)
  primera_parte = primera_parte.slice(0,primera_parte.length-1);
  resultado = primera_parte

  var primera_parte_sz = primera_parte.length * 16;

  var ultima_parte = texto.slice(primera_parte_sz)
  var parte_robada = primera_parte[primera_parte.length-1].slice(0,ultima_parte.length)

  var completar = primera_parte[primera_parte.length-1].slice(ultima_parte.length)

  var final_xor = AddRoundKey(ultima_parte,parte_robada)
  var texto_xor = final_xor
  for (var i = 0; i < completar.length; i++){
    texto_xor.push(completar[i])
  }

  var cifrado = rinjdael(key, texto_xor).cifrado
  cifrado = cifrado.match(/.{1,2}/g)
  resultado.pop()
  resultado.push(cifrado)
  resultado.push(rellenarVacio(parte_robada,16,"--"))

  return resultado
}

// Usada por el cbc robado para rellenar con valor nulo cuando tenga menor tamaño
function rellenarVacio(array, minLength, fillValue){
  return Object.assign(new Array(minLength).fill(fillValue), array);
}

function dividir_bloque (bloque){
  var resultado = []
  for (var i = 0; i < bloque.length; i = i +15){
    if (i+15<=bloque.length){
      resultado.push(bloque.slice(i,i+16))
    }
    i++
  }
  return resultado
}

// --------------- Funciones aes ----------------- \\

function rinjdael (key, texto) {
  var salida_claves = []
  var salida_estados = []

  var subclaves = expansion(key)
  
  var E1 = AddRoundKey(texto,key)

  for (var i = 1; i < subclaves.length-1; i++){

    salida_claves.push(matriz_to_array(subclaves[i-1]).join(""))
    salida_estados.push(E1.join(""))

    var E2 = SubBytes(E1)
    var E3 = ShiftRow(E2)
    var E4 = MixColumn(E3)
    var E5 = AddRoundKey(E4,matriz_to_array(subclaves[i]))
    E1 = E5
  }

  E2 = SubBytes(E1)
  E3 = ShiftRow(E2)
  E4 = AddRoundKey(E3,matriz_to_array(subclaves[subclaves.length-1]))

  salida_claves.push(matriz_to_array(subclaves[subclaves.length-1]).join(""))
  salida_estados.push(E4.join(""))

  var salida = {
		subclaves: salida_claves,
		estados: salida_estados,
    cifrado: E4.join("")
	};
	return salida;

}

function hex_to_dec (array){
  var resultado = []
  for (var i = 0; i < array.length; i++){
    resultado[i] = parseInt(array[i],16);
  }
  return resultado
}

function dec_to_hex (array){
  var resultado = []
  for (var i = 0; i < array.length; i++){
    resultado[i] = array[i].toString(16).padStart(2, "0");
  }
  return resultado
}

function XOR_bitwise (array1, array2) {
  var resultado = []
  for (var i = 0; i < array1.length; i++){
    resultado[i] = array1[i] ^ array2[i] 
  }
  return resultado
}

function array_to_matriz (array) {
  var resultado = []
  for (var i = 0; i < 4; i++){   
    var aux = []
    for (var j = 0; j < 4; j++){
      aux.push(array[i+(4*j)])
    }
    resultado.push(aux)
  }
  return resultado
}

function matriz_to_array (matriz) {
  var resultado = []
  for (var i = 0; i < 4; i++){ 
    for (var j = 0; j < 4; j++){
      resultado.push(matriz[j][i])
    }
  }
  return resultado
}

function transponer (matriz) {
  var resultado = []
  var array = matriz_to_array(matriz)
  
  for (var i = 0; i < 4; i++){   
    var aux = []
    for (var j = 0; j < 4; j++){
      aux.push(array[j+(4*i)])
    }
    resultado.push(aux)
  }

  return resultado
}

function AddRoundKey(array1,array2){
  var resultado = []
  var dec_array1 = hex_to_dec(array1)
  var dec_array2 = hex_to_dec(array2)

  var xor = XOR_bitwise(dec_array1,dec_array2)

  resultado = dec_to_hex(xor)
  
  return resultado
}

function S_byte (byte) {
  var resultado = []

  var S_box = [
    ["63", "7c", "77", "7b", "f2", "6b", "6f", "c5", "30", "01", "67", "2b", "fe", "d7", "ab", "76"],
    ["ca", "82", "c9", "7d", "fa", "59", "47", "f0", "ad", "d4", "a2", "af", "9c", "a4", "72", "c0"],
    ["b7", "fd", "93", "26", "36", "3f", "f7", "cc", "34", "a5", "e5", "f1", "71", "d8", "31", "15"],
    ["04", "c7", "23", "c3", "18", "96", "05", "9a", "07", "12", "80", "e2", "eb", "27", "b2", "75"],
    ["09", "83", "2c", "1a", "1b", "6e", "5a", "a0", "52", "3b", "d6", "b3", "29", "e3", "2f", "84"],
    ["53", "d1", "00", "ed", "20", "fc", "b1", "5b", "6a", "cb", "be", "39", "4a", "4c", "58", "cf"],
    ["d0", "ef", "aa", "fb", "43", "4d", "33", "85", "45", "f9", "02", "7f", "50", "3c", "9f", "a8"],
    ["51", "a3", "40", "8f", "92", "9d", "38", "f5", "bc", "b6", "da", "21", "10", "ff", "f3", "d2"],
    ["cd", "0c", "13", "ec", "5f", "97", "44", "17", "c4", "a7", "7e", "3d", "64", "5d", "19", "73"],
    ["60", "81", "4f", "dc", "22", "2a", "90", "88", "46", "ee", "b8", "14", "de", "5e", "0b", "db"],
    ["e0", "32", "3a", "0a", "49", "06", "24", "5c", "c2", "d3", "ac", "62", "91", "95", "e4", "79"],
    ["e7", "c8", "37", "6d", "8d", "d5", "4e", "a9", "6c", "56", "f4", "ea", "65", "7a", "ae", "08"],
    ["ba", "78", "25", "2e", "1c", "a6", "b4", "c6", "e8", "dd", "74", "1f", "4b", "bd", "8b", "8a"],
    ["70", "3e", "b5", "66", "48", "03", "f6", "0e", "61", "35", "57", "b9", "86", "c1", "1d", "9e"],
    ["e1", "f8", "98", "11", "69", "d9", "8e", "94", "9b", "1e", "87", "e9", "ce", "55", "28", "df"],
    ["8c", "a1", "89", "0d", "bf", "e6", "42", "68", "41", "99", "2d", "0f", "b0", "54", "bb", "16"]
  ];

  var dividir = byte.split("")

  resultado = S_box[parseInt(dividir[0],16)][parseInt(dividir[1],16)]

  return resultado
}

function SubBytes(array){
  var resultado = []
  for (var i = 0; i < array.length; i++){
    resultado[i] = S_byte(array[i])
  }
  return resultado
}

function ShiftRow(array){
  var resultado = []

  var aux = array.join("").match(/.{1,2}/g)

  var array_matriz = array_to_matriz(aux)

  for (var i = 1; i < array_matriz.length; i++){
    for (var j = 0; j < i; j++){
      var elem = array_matriz[i].shift(array_matriz[i][0])
      array_matriz[i].push(elem)
    }
  }
   
  resultado = matriz_to_array(array_matriz)
  return resultado
}


// ------ Funciones anteriores (snow aes) modificadas ------ \\

function separar(byte){
  var bytePos = byte.reduce((c, v, i) => v == 1 ? c.concat(i) : c, []); // array de posiciones donde hay un 1
  bytePos.reverse()
  return bytePos
}

function multiplicacion(byte1, byte2) {
  var byteAlgoritmo = ["0","0","0","1","1","0","1","1"]
  var size = byte2
  let aux1 = byte1.join("")
  let aux2 = aux1.split("")

  for (var i = 7; i > size; i--){
    if (aux2[0] == 0){
      aux2.shift()
      aux2.push(0)
    } else if (aux2[0] == 1){
      aux2.shift()
      aux2.push(0)

      var byte1_xor = parseInt(aux2.join(''),2)
      var byteAlgoritmo_xor = parseInt(byteAlgoritmo.join(''),2)
      var xor = byte1_xor ^ byteAlgoritmo_xor //xor bit a bit en decimal
      xor = xor.toString(2).padStart(8, "0").split("");
      for (var j = 0; j < xor.length; j++){
        xor[j] = parseInt(xor[j])
      }
      aux2 = xor
    }
  }
  resultado = aux2
  return resultado
}

function snow_aes(byte1, byte2){
  var posiciones = separar(byte2);
  var resultado = multiplicacion(byte1,posiciones[0]);
  resultado = parseInt(resultado.join(''),2)
  let operacion
  var byte2_xor
  for (var i = 1; i < posiciones.length; i++){

    operacion = multiplicacion(byte1,posiciones[i])
    
    byte2_xor = parseInt(operacion.join(''),2)
    
    resultado = resultado ^ byte2_xor
  }

  resultado = resultado.toString(2)
  return resultado
}

function mult(byte1,byte2){
  var byte1_array = parseInt(byte1,16).toString(2).padStart(8, "0").split(""); // bytes del tipo ["1","0","0","1","1","1","0","1"]
  var byte2_array = parseInt(byte2,16).toString(2).padStart(8, "0").split("");

  for (var i = 0; i < byte1_array.length; i++){
    byte1_array[i] = parseInt(byte1_array[i]);
    byte2_array[i] = parseInt(byte2_array[i]);
  }

  var valor = snow_aes(byte1_array,byte2_array)
  valor = parseInt(valor,2).toString(16).padStart(2, "0");
  return valor
}

// --------------------------------------------------------- \\

function MixColumn (array) {
  var resultado = [[],[],[],[]]
  var Mix_box = [
    ["02", "03", "01", "01"],
    ["01", "02", "03", "01"],
    ["01", "01", "02", "03"],
    ["03", "01", "01", "02"]
  ]

  var S = array_to_matriz(array)


  for (var i = 0; i < 4; i++){

    var aux = parseInt(mult(S[0][0],Mix_box[i][0]),16)
    aux = aux ^ parseInt(mult(S[1][0],Mix_box[i][1]),16)
    aux = aux ^ parseInt(mult(S[2][0],Mix_box[i][2]),16)
    aux = aux ^ parseInt(mult(S[3][0],Mix_box[i][3]),16)

    resultado[i].push(aux.toString(16).padStart(2, "0"))

    aux = parseInt(mult(S[0][1],Mix_box[i][0]),16)
    aux = aux ^ parseInt(mult(S[1][1],Mix_box[i][1]),16)
    aux = aux ^ parseInt(mult(S[2][1],Mix_box[i][2]),16)
    aux = aux ^ parseInt(mult(S[3][1],Mix_box[i][3]),16)

    resultado[i].push(aux.toString(16).padStart(2, "0"))

    aux = parseInt(mult(S[0][2],Mix_box[i][0]),16)
    aux = aux ^ parseInt(mult(S[1][2],Mix_box[i][1]),16)
    aux = aux ^ parseInt(mult(S[2][2],Mix_box[i][2]),16)
    aux = aux ^ parseInt(mult(S[3][2],Mix_box[i][3]),16)

    resultado[i].push(aux.toString(16).padStart(2, "0"))

    aux = parseInt(mult(S[0][3],Mix_box[i][0]),16)
    aux = aux ^ parseInt(mult(S[1][3],Mix_box[i][1]),16)
    aux = aux ^ parseInt(mult(S[2][3],Mix_box[i][2]),16)
    aux = aux ^ parseInt(mult(S[3][3],Mix_box[i][3]),16)

    resultado[i].push(aux.toString(16).padStart(2, "0"))
  }

  resultado = matriz_to_array(resultado)
  return resultado
}

function expansion (array) {
  var subclaves = []
  var RCon = [
    ["01", "00", "00", "00"],
    ["02", "00", "00", "00"],
    ["04", "00", "00", "00"],
    ["08", "00", "00", "00"],
    ["10", "00", "00", "00"],
    ["20", "00", "00", "00"],
    ["40", "00", "00", "00"],
    ["80", "00", "00", "00"],
    ["1B", "00", "00", "00"],
    ["36", "00", "00", "00"],
  ]
  var key_matriz = array_to_matriz(array)
  var key_t = transponer(key_matriz)
  subclaves.push(transponer(key_t))  

  var ultima = key_t[3]
  aux1 = ultima.join("").match(/.{1,2}/g);
  var aux = aux1.shift(aux1[0])
  aux1.push(aux)

  var SubUlt = SubBytes(aux1)

  var nueva = XOR_bitwise(hex_to_dec(key_t[0]),hex_to_dec(SubUlt))
  nueva = XOR_bitwise(nueva,hex_to_dec(RCon[0]))
  nueva = dec_to_hex(nueva)

  for (var i = 1; i <= 10; i++){
    key_t[0] = nueva

    key_t[1] = XOR_bitwise(hex_to_dec(key_t[1]),hex_to_dec(key_t[0]))
    key_t[1] = dec_to_hex(key_t[1])
    
    key_t[2] = XOR_bitwise(hex_to_dec(key_t[2]),hex_to_dec(key_t[1]))
    key_t[2] = dec_to_hex(key_t[2])

    key_t[3] = XOR_bitwise(hex_to_dec(key_t[3]),hex_to_dec(key_t[2]))
    key_t[3] = dec_to_hex(key_t[3])

    if (i<10){
      ultima = key_t[3]
      aux1 = ultima.join("").match(/.{1,2}/g);
      aux = aux1.shift(aux1[0])
      aux1.push(aux)
      SubUlt = SubBytes(aux1)

      nueva = XOR_bitwise(hex_to_dec(key_t[0]),hex_to_dec(SubUlt))
      nueva = XOR_bitwise(nueva,hex_to_dec(RCon[i]))
      nueva = dec_to_hex(nueva)
    }

    subclaves.push(transponer(key_t))  
  }
  return subclaves
}

function imprimirSalida(salida){

  var txt = ""
  for (var i = 0; i < salida.length; i++){
    var aux = "Bloque "+i+" de Texto Cifrado: " + salida[i].join(" ").toUpperCase() +`<br>`
    txt = txt + aux
  }

  document.getElementById("s_salida").innerHTML = txt;

  var mostrar = document.getElementById("salida");
    if (mostrar.style.display === "none") {
      mostrar.style.display = "block";
    } else {
      mostrar.style.display = "none";
    }

}
