let pattern ="";
for(let i=5; i>=0; i--){
  //space
  for(let j=4; j>=i; j--){
    pattern +=" ";
  }
  //star
  for(let k=0; k<=i; k++){
    pattern +="*";
  }
  pattern +="\n";
}
console.log(pattern);