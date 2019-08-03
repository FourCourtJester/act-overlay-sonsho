/**
* @class
*/
class SonshoToolkit {
    /**
     * @constructor
     */
    constructor () {
        this.viewport = {
            sm: '(min-width: 576px)',
            md: '(min-width: 768px)',
            lg: '(min-width: 992px)',
            xl: '(min-width: 1200px)',
        }
    }

    /**
     * Detect touch screen devices.
     * @return {Boolean}
     */
    isTouchEnabled () {
        return 'ontouchstart' in window
    }

    /**
     * Checks to see if val is in the Array arr
     * @param {Array} arr - The Array to check
     * @param {String} val - The name of the attribute
     * @return {Boolean}
     */
    in (arr = [], val = '') {
        return !!~arr.indexOf(val)
    }

    /**
     * Activates Bootstrap tooltips if present in the page.
     * Will not execute on touch enabled devices
     * @param {jQuery} [$container] - The JQuery Element to add tooltips to
     * @return {CartographyDOMToolkit}
     */
    tooltips ($container = $('body')) {
        if (this.isTouchEnabled()) return this

        // Only attach tooltips if this is a desktop browser
        // $.each($container.find(`[data-toggle='tooltip']`).addBack(`[data-toggle='tooltip']`), (i, e) => {
        //     $(e).tooltip({ trigger: 'hover' }).attr('data-tooltip-enabled', true)
        // })

        return this
    }

    /**
     * Get the value of the path in an Object
     * @param {Object} obj - The object to traverse
     * @param {String} path - The path to the value
     * @return {*}
     */
    getObjValue (obj = {}, path = '') {
        if (obj == undefined) return undefined

        // Convert the path to an Array if it is already not
        if (!Array.isArray(path)) path = path.split('.')

        // When there is no more depth to recurse, return the value
        if (!path.length) return obj

        // Get the prop
        const field = path.shift()

        // If the prop exists, recurse and return
        if (Object.prototype.hasOwnProperty.call(obj, field)) return this.getObjValue(obj[field], path)

        // If the prop does not exist, return undefined
        return undefined
    }

    /**
     * Set the value (or text) of a JQuery Element
     * @param {jQuery} $element - The JQuery Element
     * @param {String} val - The value to set
     * @return {SonshoToolkit}
     */
    setElementValue ($element = $(), val = '') {
        // No element
        if (!$element.length) return this
        $element.text(val)
        return

        // // Do something based upon tagName
        // switch ($element.prop('tagName').toLowerCase()) {
        // // Non Inputs
        // default:
        //     if ($element.children().length) {
        //         // If this element has children, we can't use .text(), so find the first TEXT_NODE
        //         var node = $element.contents().filter(function () {
        //             return this.nodeType == 3
        //         })

        //         // If there is no TEXT_NODE in this element, create it
        //         // Otherwise, assign the value
        //         if (!node.length) $element.prepend(document.createTextNode(val))
        //         else node[0].nodeValue = val
        //     } else {
        //         $element.text(val)
        //     }
        //     break
        // }
    }

    /**
     * 
     * @param {String} str 
     * @return {String}
     */
    slugify (str) {
        return str.toLowerCase().replace(/['()]/g, '').split(' ').join('-')
    }
}

// Declare
const Utils = new SonshoToolkit()

// Globals
Utils.tooltips()