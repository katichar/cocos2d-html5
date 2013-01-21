/****************************************************************************
 Copyright (c) 2010-2012 cocos2d-x.org
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011      Zynga Inc.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

/**
 * cc.LabelTTF is a subclass of cc.TextureNode that knows how to render text labels<br/>
 * All features from cc.TextureNode are valid in cc.LabelTTF<br/>
 * cc.LabelTTF objects are slow for js-binding on mobile devices.<br/>
 * Consider using cc.LabelAtlas or cc.LabelBMFont instead.<br/>
 * @class
 * @extends cc.Sprite
 */
cc.LabelTTF = cc.Sprite.extend(/** @lends cc.LabelTTF# */{
    _dimensions:cc.SizeZero(),
    _hAlignment:cc.TEXT_ALIGNMENT_CENTER,
    _vAlignment:cc.VERTICAL_TEXT_ALIGNMENT_TOP,
    _fontName:"Arial",
    _fontSize:0.0,
    _string:"",
    _fontStyleStr:null,
    _colorStyleStr:null,

    _labelCanvas:null,
    _labelContext:null,
    /**
     * Constructor
     */
    ctor:function () {
        this._super();

        this._opacityModifyRGB = false;
        this._fontStyleStr = "";
        this._colorStyleStr = "";
        this._opacity = 255;
        this._color = cc.white();
        this._setColorStyleStr();
    },

    init:function (callsuper) {
        if (callsuper) {
            return this._super();
        }
        return this.initWithString([" ", this._fontName, this._fontSize]);
    },
    /**
     * Prints out a description of this class
     * @return {String}
     */
    description:function () {
        return "<cc.LabelTTF | FontName =" + this._fontName + " FontSize = " + this._fontSize.toFixed(1) + ">";
    },

    setColor:function (color3) {
        this._super(color3);
        this._setColorStyleStr();
    },

    setOpacity:function (opacity) {
        if (this._opacity === opacity)
            return;

        this._opacity = opacity;
        this._setColorStyleStr();
        this.setNodeDirty();
    },

    _setColorStyleStr:function () {
        this._colorStyleStr = "rgba(" + this._color.r + "," + this._color.g + "," + this._color.b + ", " + this._opacity / 255 + ")";
    },

    /**
     * changes the string to render
     * @warning Changing the string is as expensive as creating a new cc.LabelTTF. To obtain better performance use cc.LabelAtlas
     * @param {String} text text for the label
     */
    setString:function (text) {
        cc.Assert(text != null, "Invalid string");
        if (this._string != text) {
            this._string = text + "";

            // Force update
            if (this._string.length > 0) {
                if (cc.renderContextType === cc.CANVAS)
                    this._updateTTF();
                else
                    this._updateTexture();
            }
        }
    },

    _updateTexture:function () {
        this._labelContext = this._getLabelContext();

        //set size for labelCanvas
        this._labelContext.font = this._fontStyleStr;
        var size = this._computeLabelSizeForWebGL();

        this._labelCanvas.width = size.width;
        this._labelCanvas.height = size.height;

        this.setContentSize(cc.size(this._labelCanvas.width, this._labelCanvas.height));

        //draw text to labelCanvas
        this._drawTTFInCanvasForWebGL(this._labelContext);
        this._texture.handleLoadedTexture();
        this.setTextureRect(cc.rect(0, 0, this._labelCanvas.width, this._labelCanvas.height));
        return true;
    },

    _computeLabelSizeForWebGL:function () {
        var dim, rowHeight, i, tmpWords, maxLineWidth, rowCount;
        if (this._dimensions.width == 0) {
            if (this._string.indexOf("\n") === -1) {
                dim = this._labelContext.measureText(this._string);
                return cc.size(dim.width, this._fontSize);
            } else {
                rowHeight = this._fontSize * 1.2;
                tmpWords = this._string.split("\n");
                rowCount = tmpWords.length;
                maxLineWidth = 0;
                for (i = 0; i < rowCount; i++)
                    maxLineWidth = Math.max(maxLineWidth, this._labelContext.measureText(tmpWords[i]).width);

                return cc.size(maxLineWidth, rowHeight * rowCount);
            }
        } else {
            if (this._string.indexOf("\n") === -1) {
                dim = this._labelContext.measureText(this._string);
                if (dim.width <= this._dimensions.width)
                    return cc.size(this._dimensions.width, this._dimensions.height);
                else {
                    rowCount = 0 | (dim.width / this._dimensions.width);
                    rowCount += (dim.width % this._dimensions.width === 0) ? 0 : 1;
                    return cc.size(this._dimensions.width, this._dimensions.height * rowCount);
                }
            } else {
                rowHeight = this._dimensions.height;
                tmpWords = this._string.split("\n");
                rowCount = tmpWords.length;
                for (i = 0; i < tmpWords.length; i++) {
                    var currRowWidth = this._labelContext.measureText(tmpWords[i]).width;
                    if (currRowWidth > this._dimensions.width) {
                        rowCount += 0 | (currRowWidth / this._dimensions.width);
                        rowCount += (currRowWidth % this._dimensions.width === 0) ? -1 : 0;
                    }
                }
                return cc.size(this._dimensions.width, rowHeight * rowCount);
            }
        }
    },

    _drawTTFInCanvasForWebGL:function (context) {
        if (!context)
            return;

        context.save();
        context.translate(this._contentSize.width / 2, this._contentSize.height / 2);
        //this is fillText for canvas
        if (context.font != this._fontStyleStr)
            context.font = this._fontStyleStr;
        context.fillStyle = "rgba(255,255,255,1)";

        if (((this._contentSize.width > this._dimensions.width) || this._string.indexOf("\n") > -1) && this._dimensions.width !== 0) {
            context.textBaseline = cc.LabelTTF._textBaseline[this._vAlignment];
            context.textAlign = cc.LabelTTF._textAlign[this._hAlignment];
            this._wrapText(context, this._string,
                -this._dimensions.width * this._anchorPoint.x,
                this._dimensions.height * this._anchorPoint.y,
                this._dimensions.width,
                this._dimensions.height,
                this._fontSize * 1.2);
        } else if (this._dimensions.width == 0) {
            context.textBaseline = "bottom";
            context.textAlign = "left";

            if (this._string.indexOf("\n") > -1) {
                this._multiLineText(context);
            } else
                context.fillText(this._string, -this._contentSize.width * this._anchorPoint.x, this._contentSize.height * this._anchorPoint.y);
        } else {
            context.textBaseline = cc.LabelTTF._textBaseline[this._vAlignment];
            context.textAlign = cc.LabelTTF._textAlign[this._hAlignment];
            var xOffset = 0, yOffset = 0;
            if (this._hAlignment == cc.TEXT_ALIGNMENT_RIGHT)
                xOffset = this._dimensions.width;
            if (this._hAlignment == cc.TEXT_ALIGNMENT_CENTER)
                xOffset = this._dimensions.width / 2;

            if (this._vAlignment == cc.VERTICAL_TEXT_ALIGNMENT_TOP)
                yOffset = -this._dimensions.height;
            if (this._vAlignment == cc.VERTICAL_TEXT_ALIGNMENT_CENTER)
                yOffset = -this._dimensions.height / 2;

            context.fillText(this._string, -this._dimensions.width * this._anchorPoint.x + xOffset,
                this._dimensions.height * this._anchorPoint.y + yOffset);
        }
        context.restore();
    },

    _getLabelContext:function () {
        if (this._labelContext)
            return this._labelContext;

        if (!this._labelCanvas) {
            this._labelCanvas = document.createElement("canvas");
            var labelTexture = new cc.Texture2D();
            labelTexture.initWithElement(this._labelCanvas);
            this.setTexture(labelTexture);
        }
        this._labelContext = this._labelCanvas.getContext("2d");
        return this._labelContext;
    },

    /**
     * returns the text of the label
     * @return {String}
     */
    getString:function () {
        return this._string;
    },

    /**
     * return Horizontal Alignment of cc.LabelTTF
     * @return {cc.TEXT_ALIGNMENT_LEFT|cc.TEXT_ALIGNMENT_CENTER|cc.TEXT_ALIGNMENT_RIGHT}
     */
    getHorizontalAlignment:function () {
        return this._hAlignment;
    },

    /**
     * set Horizontal Alignment of cc.LabelTTF
     * @param {cc.TEXT_ALIGNMENT_LEFT|cc.TEXT_ALIGNMENT_CENTER|cc.TEXT_ALIGNMENT_RIGHT} alignment HorizontalAlignment
     */
    setHorizontalAlignment:function (alignment) {
        if (alignment != this._hAlignment) {
            this._hAlignment = alignment;

            // Force update
            if (this._string.length > 0) {
                if (cc.renderContextType === cc.CANVAS)
                    this._updateTTF();
                else
                    this._updateTexture();
            }
        }
    },

    /**
     * return Vertical Alignment of cc.LabelTTF
     * @return {cc.VERTICAL_TEXT_ALIGNMENT_TOP|cc.VERTICAL_TEXT_ALIGNMENT_CENTER|cc.VERTICAL_TEXT_ALIGNMENT_BOTTOM}
     */
    getVerticalAlignment:function () {
        return this._vAlignment;
    },

    /**
     * set Vertical Alignment of cc.LabelTTF
     * @param {cc.VERTICAL_TEXT_ALIGNMENT_TOP|cc.VERTICAL_TEXT_ALIGNMENT_CENTER|cc.VERTICAL_TEXT_ALIGNMENT_BOTTOM} verticalAlignment
     */
    setVerticalAlignment:function (verticalAlignment) {
        if (verticalAlignment != this._vAlignment) {
            this._vAlignment = verticalAlignment;

            // Force update
            if (this._string.length > 0) {
                if (cc.renderContextType === cc.CANVAS)
                    this._updateTTF();
                else
                    this._updateTexture();
            }
        }
    },

    /**
     * return Dimensions of cc.LabelTTF
     * @return {cc.Size}
     */
    getDimensions:function () {
        return this._dimensions;
    },

    /**
     * set Dimensions of cc.LabelTTF
     * @param {cc.Size} dim
     */
    setDimensions:function (dim) {
        if (dim.width != this._dimensions.width || dim.height != this._dimensions.height) {
            this._dimensions = dim;

            // Force udpate
            if (this._string.length > 0) {
                if (cc.renderContextType === cc.CANVAS)
                    this._updateTTF();
                else
                    this._updateTexture();
            }
        }
    },

    /**
     * return font size of cc.LabelTTF
     * @return {Number}
     */
    getFontSize:function () {
        return this._fontSize;
    },

    /**
     * set font size of cc.LabelTTF
     * @param {Number} fontSize
     */
    setFontSize:function (fontSize) {
        if (this._fontSize != fontSize) {
            this._fontSize = fontSize;

            // Force update
            if (this._string.length > 0) {
                if (cc.renderContextType === cc.CANVAS)
                    this._updateTTF();
                else
                    this._updateTexture();
            }
        }
    },

    /**
     * return font name of cc.LabelTTF
     * @return {String}
     */
    getFontName:function () {
        return this._fontName;
    },

    /**
     * set font name of cc.LabelTTF
     * @param {String} fontName
     */
    setFontName:function (fontName) {
        if (this._fontName != fontName) {
            this._fontName = new String(fontName);
            // Force update
            if (this._string.length > 0) {
                if (cc.renderContextType === cc.CANVAS)
                    this._updateTTF();
                else
                    this._updateTexture();
            }
        }
    },

    /**
     * initializes the cc.LabelTTF with a font name, alignment, dimension and font size
     * @param {String} initialize string
     * @param {String} fontName
     * @param {Number} fontSize
     * @param {cc.Size} dimensions
     * @param {cc.TEXT_ALIGNMENT_LEFT|cc.TEXT_ALIGNMENT_CENTER|cc.TEXT_ALIGNMENT_RIGHT} alignment
     * @return {Boolean} return false on error
     */
    initWithString:function (arg) {
        var strInfo = new String(arg[0]), fontName, fontSize, dimensions, hAlignment, vAlignment;
        cc.Assert(strInfo != null, "cc.LabelTTF.initWithString() label is null");
        if (arg.length == 6) {
            fontName = arg[1];
            fontSize = arg[2];
            dimensions = arg[3];
            hAlignment = arg[4];
            vAlignment = arg[5];
        } else if (arg.length == 5) {
            fontName = arg[1];
            fontSize = arg[2];
            dimensions = arg[3];
            hAlignment = arg[4];
            vAlignment = cc.VERTICAL_TEXT_ALIGNMENT_TOP;
        } else {
            fontName = arg[1];
            fontSize = arg[2];
            dimensions = cc.size(0, arg[2]);
            hAlignment = cc.TEXT_ALIGNMENT_LEFT;
            vAlignment = cc.VERTICAL_TEXT_ALIGNMENT_BOTTOM;
        }

        if (this.init(true)) {
            if (cc.renderContextType === cc.WEBGL) {
                this.setShaderProgram(cc.ShaderCache.getInstance().programForKey(cc.LabelTTF._SHADER_PROGRAM));
            }

            this._dimensions = cc.size(dimensions.width, dimensions.height);
            this._fontName = fontName;
            this._hAlignment = hAlignment;
            this._vAlignment = vAlignment;
            this._fontSize = fontSize;
            this._fontStyleStr = this._fontSize + "px '" + this._fontName + "'";

            this.setString(strInfo);

            return true;
        }
        return false;
    },
    /**
     * renders the label
     * @param {CanvasContext|Null} ctx
     */
    draw:function (ctx, renderType) {
        renderType = renderType || cc.renderContextType;
        if (renderType === cc.CANVAS)
            this._drawTTFForCanvas(ctx);
        else
            this._super(ctx);
    },

    _drawTTFForCanvas:function (context) {
        context = context || cc.renderContext;
        if (this._flipX)
            context.scale(-1, 1);

        if (this._flipY)
            context.scale(1, -1);

        //this is fillText for canvas
        context.fillStyle = this._colorStyleStr;

        if (context.font != this._fontStyleStr)
            context.font = this._fontStyleStr;

        if (((this._contentSize.width > this._dimensions.width) || this._string.indexOf("\n") > -1) && this._dimensions.width !== 0) {
            context.textBaseline = cc.LabelTTF._textBaseline[this._vAlignment];
            context.textAlign = cc.LabelTTF._textAlign[this._hAlignment];
            this._wrapText(context, this._string,
                -this._dimensions.width * this._anchorPoint.x,
                this._dimensions.height * this._anchorPoint.y,
                this._dimensions.width,
                this._dimensions.height,
                this._fontSize * 1.2);
        } else if (this._dimensions.width == 0) {
            context.textBaseline = "bottom";
            context.textAlign = "left";

            if (this._string.indexOf("\n") > -1)
                this._multiLineText(context);
            else
                context.fillText(this._string, -this._contentSize.width * this._anchorPoint.x, this._contentSize.height * this._anchorPoint.y);
        } else {
            context.textBaseline = cc.LabelTTF._textBaseline[this._vAlignment];
            context.textAlign = cc.LabelTTF._textAlign[this._hAlignment];
            var xOffset = 0, yOffset = 0;
            if (this._hAlignment == cc.TEXT_ALIGNMENT_RIGHT)
                xOffset = this._dimensions.width;
            if (this._hAlignment == cc.TEXT_ALIGNMENT_CENTER)
                xOffset = this._dimensions.width / 2;

            if (this._vAlignment == cc.VERTICAL_TEXT_ALIGNMENT_TOP)
                yOffset = -this._dimensions.height;
            if (this._vAlignment == cc.VERTICAL_TEXT_ALIGNMENT_CENTER)
                yOffset = -this._dimensions.height / 2;

            context.fillText(this._string, -this._dimensions.width * this._anchorPoint.x + xOffset,
                this._dimensions.height * this._anchorPoint.y + yOffset);
        }
        cc.INCREMENT_GL_DRAWS(1);
    },

    _multiLineText:function (context) {
        var rowHeight = this._fontSize * 1.2;
        var tmpWords = this._string.split("\n");
        var lineHeight = tmpWords.length;
        var splitStrWidthArr = [];
        var maxLineWidth = 0;
        for (var i = 0; i < lineHeight; i++) {
            splitStrWidthArr[i] = context.measureText(tmpWords[i]).width;
            if (splitStrWidthArr[i] > maxLineWidth)
                maxLineWidth = splitStrWidthArr[i];
        }

        var centerPoint = cc.p(maxLineWidth / 2, (lineHeight * rowHeight) / 2);
        for (i = 0; i < lineHeight; i++) {
            var xOffset = -splitStrWidthArr[i] / 2;
            if (this._hAlignment == cc.TEXT_ALIGNMENT_RIGHT)
                xOffset = centerPoint.x - maxLineWidth;
            if (this._hAlignment == cc.TEXT_ALIGNMENT_CENTER)
                xOffset = maxLineWidth - splitStrWidthArr[i];
            context.fillText(tmpWords[i], xOffset, i * rowHeight - centerPoint.y + rowHeight);
        }
    },

    _wrapText:function (context, text, x, y, maxWidth, maxHeight, lineHeight) {
        var num = this._lineCount(context) - 1;
        var xOffset = 0, yOffset = 0;
        if (this._hAlignment === cc.TEXT_ALIGNMENT_RIGHT)
            xOffset = maxWidth;
        if (this._hAlignment === cc.TEXT_ALIGNMENT_CENTER)
            xOffset = maxWidth / 2;

        if (this._vAlignment === cc.VERTICAL_TEXT_ALIGNMENT_TOP)
            yOffset = -maxHeight;
        if (this._vAlignment === cc.VERTICAL_TEXT_ALIGNMENT_BOTTOM)
            yOffset = -lineHeight * num;
        if (this._vAlignment === cc.VERTICAL_TEXT_ALIGNMENT_CENTER)
            yOffset = -maxHeight / 2 - (lineHeight * num / 2);

        var tmpWords = text.split("\n");
        for (var j = 0; j < tmpWords.length; j++) {
            var jOffset = j * lineHeight;
            var words = tmpWords[j].split(" ");
            var line = "";

            for (var n = 0; n < words.length; n++) {
                var testLine = line + words[n] + " ";
                var testWidth = context.measureText(testLine).width - context.measureText(" ").width;
                if (testWidth >= maxWidth) {
                    context.fillText(line, x + xOffset, y + yOffset + jOffset);
                    y += lineHeight;
                    line = words[n] + " ";
                } else {
                    line = testLine;
                }
                if (n == words.length - 1) {
                    context.fillText(line, x + xOffset, y + yOffset + jOffset);
                }
            }
        }
    },

    _lineCount:function (context) {
        if (this._dimensions.width == 0) {
            return 1;
        }
        context = context || cc.renderContext;
        var words = this._string.split(" ");
        var line = "", num = 0;
        context.save();
        for (var n = 0; n < words.length; n++) {
            var tmpLine = line + words[n] + " ";
            var tmpWidth = context.measureText(tmpLine).width - context.measureText(" ").width;
            if (tmpWidth >= this._dimensions.width) {
                num++;
                line = words[n] + " ";
            }
            else {
                line = tmpLine;
            }
            if (n == words.length - 1) {
                num++;
            }
        }
        context.restore();
        return num;
    },

    _updateTTF:function (ctx) {
        var context = ctx || cc.renderContext;
        context.save();

        this._fontStyleStr = this._fontSize + "px '" + this._fontName + "'";
        context.font = this._fontStyleStr;
        var dim = cc.renderContext.measureText(this._string);
        this.setContentSize(cc.size(dim.width, this._fontSize));

        context.restore();
        this.setNodeDirty();
    }
});

cc.LabelTTF._textAlign = ["left", "center", "right"];

cc.LabelTTF._textBaseline = ["top", "middle", "bottom"];

cc.LabelTTF._SHADER_PROGRAM = cc.USE_LA88_LABELS ? cc.SHADER_POSITION_TEXTURECOLOR : cc.SHADER_POSITION_TEXTUREA8COLOR;

/**
 * creates a cc.LabelTTF from a fontname, alignment, dimension and font size
 * @param {String} label
 * @param {String} fontName
 * @param {Number} fontSize
 * @param {cc.Size} dimensions
 * @param {cc.TEXT_ALIGNMENT_LEFT|cc.TEXT_ALIGNMENT_CENTER|cc.TEXT_ALIGNMENT_RIGHT} alignment
 * @return {cc.LabelTTF|Null}
 * @example
 * // Example
 * var myLabel = cc.LabelTTF.create('label text',  'Times New Roman', 32, cc.size(32,16), cc.TEXT_ALIGNMENT_LEFT);
 */
cc.LabelTTF.create = function (/* Multi arguments */) {
    var ret = new cc.LabelTTF();
    if (ret.initWithString(arguments)) {
        return ret;
    }
    return null;
};

cc.LabelTTF.node = function () {
    return cc.LabelTTF.create();
};
