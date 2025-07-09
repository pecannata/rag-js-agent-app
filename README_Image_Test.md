# Image Resizing Test

This README file demonstrates the new image resizing functionality in the READMEs tab.

## Features

- **Resizable Images**: You can resize images by dragging their corners in preview mode
- **Automatic Saving**: Image dimensions are automatically saved when you resize them
- **Visual Feedback**: You'll see a "Saved!" notification when dimensions are saved
- **Dimension Display**: Current dimensions are shown in the top-left corner of each image
- **Reset Functionality**: Click the reset button (↺) to restore default size
- **Reset All**: Use the "Reset All Image Sizes" button to reset all images in the document

## Test Images

Here are some sample images to test the resizing functionality:

![Sample Image 1](https://via.placeholder.com/400x300/0066CC/FFFFFF?text=Sample+Image+1)

![Sample Image 2](https://via.placeholder.com/300x200/FF6600/FFFFFF?text=Sample+Image+2)

![Sample Image 3](https://via.placeholder.com/500x250/339933/FFFFFF?text=Sample+Image+3)

## How to Test

1. Open this README file in the READMEs tab
2. Switch to Preview mode
3. Try resizing the images by dragging their corners
4. Notice the "Saved!" notification appears
5. Switch between files and return to see that sizes are preserved
6. Use the reset button to restore default sizes

## Technical Details

The functionality works by:
- Storing image dimensions in localStorage with a key format: `{filePath}:{imageSrc}`
- Automatically saving dimensions when the resize operation completes (onMouseUp event)
- Providing visual feedback during the save process
- Allowing individual and bulk reset of image sizes

Enjoy testing the new image resizing feature! 🎉
