import {Page} from "playwright";
import * as fs from "fs";
import { compress } from "compress-json";

const parseHTMLAndKeepRelations = (selector: string = "html") => {
    const rootElement = document.querySelector(selector);
    const layout = rootElement.getBoundingClientRect();
    const rootElementLoc = {
        x: layout.x,
        y: layout.y,
    };

    let pageParsedDom = {}
    let totalDomElementParsed = 0;

    const  iterateDomElements = (node: any, parent: string, id: number, parentId: number, _nthChild: number, parentAppliedCss: any) => {
        ++totalDomElementParsed;
        node.visited = true;
        let name: string = node.tagName;
        const domElement = {};

        const coordinates = node.getBoundingClientRect();
        const attributes =  findElementAttributes(node);
        const appliedCss = findAppliedCSSOnElement(node);
        const cssProps = {};
        // Prune the appliedCss following the cascade from the parentCssProps
        for (const key in appliedCss) {
            if (appliedCss[key] != parentAppliedCss[key]) {
                cssProps[key] = appliedCss[key];
            }
        }

        domElement[name] = {
            coordinates: {
                x: Math.round(coordinates.x - rootElementLoc.x),
                y: Math.round(coordinates.y - rootElementLoc.y),
                height: Math.round(coordinates.height),
                width: Math.round(coordinates.width)
            },
            uniqueId: name + "-" + cleanAttributes(attributes),
            shifted: false,
            nthChild: _nthChild,
            cssComparisonResult: {},
            attributes,
            cssProps,
            path: (parentId == 0 ? "" : parent+">") + node.tagName + ":nth-child(" + _nthChild + ")",
            childNodes: [],
            found: false,
            elementId: id,
            parentId: parentId,
        };
    
        let nthChild = 0;
        if(node.hasChildNodes()){
            for(const childNode of node.childNodes){
                const childTagName = childNode.tagName; 
                if (childTagName && childTagName !== "SCRIPT" && childTagName !== "STYLE"){
                    domElement[name]["childNodes"].push(iterateDomElements(childNode, domElement[name]["path"], id+1, id+1, ++nthChild, appliedCss));
                }
            }
        }
        return domElement;
    }

    const cleanAttributes = (attr: any) => {
        let uniqueStr = "";
        Object.entries(attr).forEach((entry) => {
            const [key, value] = entry;
            if(key !== "class"){
                uniqueStr += `${key}:${value}*`;
            }
        });
        return uniqueStr;
    }

    const findAppliedCSSOnElement = (node: any) =>{
        const appliedCSS = window.getComputedStyle(node);
        const style = {};
        // Clean url(data:...) properties to avoid long base64 URLs and keep a single digit in px values
        for(let i=0; i<appliedCSS.length; i++){
            var propName = appliedCSS.item(i);
            style[propName] = appliedCSS.getPropertyValue(propName).replace(/url\(data:[^)]+\)/g, "url(data:...)").replace(/(\d+\.\d)\d+px/g, "$1px");
        }
        
        return style;
    }

    const findElementAttributes = (node: any) => {
        const attrsValue = {};

        const attributes = node.attributes;
        for(let i=0; i<attributes.length; i++){
            const name = attributes[i].name; 
            if(name !== "elementId"){
                attrsValue[name] = attributes[i].value;
            }
        }    

        return attrsValue;
    }

    pageParsedDom = iterateDomElements(rootElement, "", 0, 0, 1, {});
    
    return [
        pageParsedDom,
        totalDomElementParsed
    ];
    
}

export const parseWebPage = async (page: Page, filename: string, selector?: any, shouldCompress: boolean=false) => {
    console.log(`\n\n********  PARSING DOM  ********`);
    const result = await page.evaluate(parseHTMLAndKeepRelations, selector);
    console.log(`filename, selector: ${filename}, ${selector}`);

    let compressedResult = {};

    if(shouldCompress){
        console.log("Compressing DOM");
        compressedResult = compress(result[0]);
    }else {
        console.log("Not compressing DOM");
        compressedResult = result[0];
    }
    
    fs.writeFileSync(filename, JSON.stringify(compressedResult), "utf-8");
    return result[0];
}
