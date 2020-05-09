const compressing = require('compressing');
compressing.tar.compressDir('src', 'src.tar')
.then((res)=>{
  console.log(res)
})
.catch((e)=>{
  console.log(e)
});
