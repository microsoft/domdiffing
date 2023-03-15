const fs = require("fs");


export const runDomDiffing = (baselineDom: any, candidateDom: any) => {
  expandComputedStyle(baselineDom, {});
  expandComputedStyle(candidateDom, {});
  compareDoms(baselineDom, candidateDom);

  let baselineResult = [];
  let candidateResult = [];

  fs.writeFileSync("baselineDom.txt", JSON.stringify(baselineDom), "utf-8");
  fs.writeFileSync("candidateDom.txt", JSON.stringify(candidateDom), "utf-8");

  prepareResult(baselineDom, baselineResult);
  prepareResult(candidateDom, candidateResult);

  return {
      "baseline": baselineResult,
      "candidate": candidateResult
  };
}

const expandComputedStyle = (dom: any, parentCssProps: any) => {
  const tagName = Object.keys(dom)[0];
  const cssProps = dom[tagName]["cssProps"];
  for (const name of parentCssProps) {
    if (cssProps[name] == undefined) {
        cssProps[name] = parentCssProps[name];
      }
  }

  // expandComputedStyle of the childNodes
  for(let i=0; i<dom[tagName]["childNodes"].length; i++){
    expandComputedStyle(dom[tagName]["childNodes"], cssProps);
  }
}

const compareDoms = (baselineDom: any, candidateDom: any) => {
  let BTagName = Object.keys(baselineDom)[0];
  let CTageName = Object.keys(candidateDom)[0];

  if((baselineDom[BTagName]["uniqueId"] == candidateDom[CTageName]["uniqueId"]) && !candidateDom[CTageName]["found"] && !baselineDom[BTagName]["found"]){
      baselineDom[BTagName]["found"] = true;
      candidateDom[CTageName]["found"] = true;
    //   console.log(`baselineDom, candidateDom: ${JSON.stringify(baselineDom[BTagName]["uniqueId"])}, ${JSON.stringify(candidateDom[BTagName]["uniqueId"])}`)
      const cssComparisonResult = compareNodeCSS(baselineDom[BTagName]["cssProps"], candidateDom[CTageName]["cssProps"]);
      candidateDom[CTageName]["cssComparisonResult"] = cssComparisonResult;

      candidateDom[CTageName]["childNodes"].forEach((CChildNode) => {
          for(let i=0; i<baselineDom[BTagName]["childNodes"].length; i++){
              let BChildNode = baselineDom[BTagName]["childNodes"][i];

              if(compareDoms(BChildNode, CChildNode)){
                  break;
              }
          }
      });

      return true;
  }

  return false;
}

const prepareResult = (dom: any, result: any) => {
  let tag = Object.keys(dom)[0];
  const tempResult = {};
  tempResult[tag] = {
      "deleted": false,
      "cssComparisonResult": {},
      "coordinates": {},
      "path": "",
      "uniqueId": ""
  };

  if(!dom[tag]["found"]){
      tempResult[tag]["deleted"] = true;
      tempResult[tag]["coordinates"] = dom[tag]["coordinates"];
      tempResult[tag]["path"] = dom[tag]["path"];
      tempResult[tag]["attributes"] = dom[tag]["attributes"];
      tempResult[tag]["uniqueId"] = dom[tag]["uniqueId"];
      result.push(tempResult);
      return;
  }

  if(Object.keys(dom[tag]["cssComparisonResult"]).length !== 0){
      tempResult[tag]["cssComparisonResult"] = dom[tag]["cssComparisonResult"];
      tempResult[tag]["coordinates"] = dom[tag]["coordinates"];
      result.push(tempResult);
  }

  tempResult[tag]["path"] = dom[tag]["path"];
  tempResult[tag]["attributes"] = dom[tag]["attributes"];
  tempResult[tag]["uniqueId"] = dom[tag]["uniqueId"];
  dom[tag]["childNodes"].forEach((childNode: any) => {
      prepareResult(childNode, result);
  });
}

const compareNodeCSS = (baseLineCSS: any, candidateCSS: any) => {
  const cssComparisonResult = {};

  for(const [key, value] of Object.entries(baseLineCSS)){
      if(candidateCSS[key] == undefined) {
          cssComparisonResult[key] = {
              "candidate": "DE",
              "baseline": value
          }
          continue;
      }

      if(candidateCSS[key] !== value){
          cssComparisonResult[key] = {
              "candidate": candidateCSS[key],
              "baseline": baseLineCSS[key]
          }
      }
  }

  for(const [key, value] of Object.entries(candidateCSS)){
      if(baseLineCSS[key] == undefined) {
          cssComparisonResult[key] = {
              "candidate": value,
              "baseline": "DE"
          }
      }
  }

  return cssComparisonResult;
}
